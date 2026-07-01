import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  AutotekaCheckDto,
  AutotekaDamageDto,
  AutotekaIncidentDto,
  AutotekaMileagePointDto,
  AutotekaOwnerDto,
  AutotekaReportDto,
} from '@hermes/shared';

type AnyRecord = Record<string, any>;

const API = 'https://api.autoteka.ru/v2/report/uuid';

function text(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const normalized = v.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function numberOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function dateFromSeconds(v: unknown): string | null {
  const n = numberOrNull(v);
  return n == null ? null : new Date(n * 1000).toISOString();
}

function parseCount(title: string | null): number {
  const m = title?.replace(/\s/g, '').match(/\d+/);
  return m ? Number(m[0]) : 0;
}

function damageSeverity(crashType: unknown): AutotekaDamageDto['severity'] {
  if (crashType === 'yellow') return 'light';
  if (crashType === 'red') return 'damage';
  if (crashType === 'black') return 'severe';
  return 'unknown';
}

function sourceFromDetails(details: unknown): string | null {
  if (!Array.isArray(details)) return null;
  return text(details.find((d) => typeof d === 'string' && d.toLowerCase().includes('источник')));
}

function priceFromEvent(event: AnyRecord): string | null {
  const details = Array.isArray(event.details) ? event.details.map(text).filter(Boolean) : [];
  const fromDetails = details.find((d) => /₽|руб/i.test(d!));
  if (fromDetails) return fromDetails;
  const priceDetails = event.additional?.repairCalculationAdditionalInformation?.priceDetails;
  if (!Array.isArray(priceDetails)) return null;
  const total = priceDetails.find((p) => text(p?.label)?.toLowerCase().includes('общая'));
  return text(total?.priceRange) ?? (typeof total?.price === 'number' ? `${total.price} ₽` : null);
}

function eventDate(event: AnyRecord): string | null {
  const raw = text(event.date);
  return raw && raw !== '-' ? raw : null;
}

function checkStatus(status: unknown): AutotekaCheckDto['status'] {
  if (status === 'ok') return 'ok';
  if (status === 'warning') return 'warning';
  if (status === 'bad' || status === 'critical') return 'bad';
  return 'unknown';
}

function detailValue(details: unknown, key: string): string | null {
  if (!Array.isArray(details)) return null;
  const item = details.find((d) => text(d?.key)?.toLowerCase() === key.toLowerCase());
  return text(item?.value);
}

@Injectable()
export class AutotekaImportService {
  extractUuid(input: string): string {
    const value = input.trim();
    const direct = value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (direct) return value;
    const fromUrl = value.match(/\/uuid\/([0-9a-f-]{36})(?:[/?#]|$)/i);
    if (fromUrl) return fromUrl[1];
    throw new BadRequestException('Не удалось найти UUID отчёта Автотеки в ссылке');
  }

  reportUrl(uuid: string): string {
    return `https://autoteka.ru/report/web/uuid/${uuid}`;
  }

  async importFromUrl(input: string): Promise<AutotekaReportDto> {
    const uuid = this.extractUuid(input);
    const url = `${API}/${uuid}.json?csAppCode=webDesktop`;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'AuctionGermes/1.0 (+autoteka import)',
      },
    });
    if (!res.ok) throw new BadRequestException(`Автотека вернула ${res.status}`);
    const json = (await res.json()) as AnyRecord;
    if (json.state && json.state !== 'success') {
      throw new BadRequestException('Отчёт Автотеки ещё не готов или недоступен');
    }
    return this.normalize(uuid, this.reportUrl(uuid), json);
  }

  normalize(uuid: string, sourceUrl: string, json: AnyRecord): AutotekaReportDto {
    const blocks = Array.isArray(json.blocks) ? json.blocks : [];
    const incidentBlock = blocks.find((b) => b?.name === 'incidentEventsGroups');
    const mileageBlock = blocks.find((b) => b?.name === 'mileageChart');
    const legalBlock = blocks.find((b) => b?.name === 'legalPurity');
    const commercialBlock = blocks.find((b) => b?.name === 'commercialUse');
    const ownersBlock = blocks.find((b) => b?.name === 'ownersHistory');
    const vehicleBlock = blocks.find((b) => b?.name === 'vehicleInformation');
    const incidentCard = incidentBlock?.cards?.find((c: AnyRecord) => c?.name === 'incidentEventsGroups');
    const mileageChart = mileageBlock?.additional?.mileageChartV2;

    const incidents = this.normalizeIncidents(incidentCard);
    const mileage = this.normalizeMileage(mileageChart);
    const head = json.head ?? {};

    return {
      uuid,
      sourceUrl,
      importedAt: new Date().toISOString(),
      reportCreatedAt: dateFromSeconds(head.createdAt),
      vin: text(head.vin),
      brand: text(head.brand),
      model: text(head.model),
      year: numberOrNull(head.year),
      incidentsTitle: text(incidentCard?.title),
      incidentsCount: parseCount(text(incidentCard?.title)) || incidents.length,
      mileageTitle: text(mileageChart?.title),
      mileageSubtitle: text(mileageChart?.subTitle),
      mileageConclusion: mileageChart?.conclusion
        ? { text: text(mileageChart.conclusion.text) ?? '', status: text(mileageChart.conclusion.status) }
        : null,
      mileageHasAnomalies: mileage.some((p) => p.anomaly),
      incidents,
      mileage,
      checks: [
        ...this.normalizeChecks(legalBlock, 'legal'),
        ...this.normalizeChecks(commercialBlock, 'commercial'),
        ...this.normalizeChecks(vehicleBlock, 'vehicle'),
      ],
      owners: this.normalizeOwners(ownersBlock),
      vehicleInfo: this.normalizeVehicleInfo(vehicleBlock),
    };
  }

  private normalizeIncidents(card: AnyRecord | undefined): AutotekaIncidentDto[] {
    const groups = card?.additional?.incidentEventsGroups;
    if (!Array.isArray(groups)) return [];
    const incidents: AutotekaIncidentDto[] = [];
    for (const group of groups) {
      const events = Array.isArray(group?.events) ? group.events : [];
      for (const event of events) {
        const title = text(event?.label);
        if (!title || /не найден[аоы]?$/i.test(title)) continue;
        const damagesRaw = event?.additional?.damages;
        const damages: AutotekaDamageDto[] = Array.isArray(damagesRaw)
          ? damagesRaw.map((d) => ({
              subject: text(d?.subject),
              description: text(d?.description),
              severity: damageSeverity(d?.crashType),
            }))
          : [];
        const details = Array.isArray(event?.details) ? event.details.map(text).filter((v: string | null): v is string => Boolean(v)) : [];
        if (damages.length === 0 && details.length === 0 && !event?.relation) continue;
        incidents.push({
          id: text(event?.id) || `${text(group?.id) ?? 'group'}-${incidents.length + 1}`,
          date: eventDate(event),
          title,
          source: sourceFromDetails(event?.details) ?? text(event?.additional?.exploitationHistoryItemEvent?.eventProducer),
          price: priceFromEvent(event),
          details,
          damages,
        });
      }
    }
    return incidents;
  }

  private normalizeMileage(chart: AnyRecord | undefined): AutotekaMileagePointDto[] {
    const points = Array.isArray(chart?.mileageChart) ? chart.mileageChart : [];
    return points
      .map((point, index): AutotekaMileagePointDto | null => {
        const mileage = numberOrNull(point?.row?.mileage);
        if (mileage == null) return null;
        const tooltip = point?.tooltip?.mileage;
        const title = text(tooltip?.title);
        const description = text(tooltip?.description);
        const anomaly = point?.status === 'anomaly' || Boolean(title?.toLowerCase().match(/аномаль|снизил|странно/)) || Boolean(description?.toLowerCase().match(/аномаль|снизил|скрут/));
        return {
          id: `${dateFromSeconds(point?.row?.date) ?? 'point'}-${index}`,
          date: dateFromSeconds(point?.row?.date),
          mileage,
          title,
          event: text(tooltip?.label),
          source: text(tooltip?.eventProducer),
          location: text(tooltip?.location),
          anomaly,
          description,
        };
      })
      .filter((v): v is AutotekaMileagePointDto => Boolean(v));
  }

  private normalizeChecks(block: AnyRecord | undefined, group: AutotekaCheckDto['group']): AutotekaCheckDto[] {
    const cards = Array.isArray(block?.cards) ? block.cards : [];
    return cards
      .map((card): AutotekaCheckDto | null => {
        const title = text(card?.title);
        if (!title) return null;
        return {
          id: text(card?.id) ?? text(card?.name) ?? `${group}-${title}`,
          title,
          status: checkStatus(card?.status),
          group,
        };
      })
      .filter((v): v is AutotekaCheckDto => Boolean(v));
  }

  private normalizeOwners(block: AnyRecord | undefined): AutotekaOwnerDto[] {
    const owners = block?.additional?.ownersHistory;
    if (!Array.isArray(owners)) return [];
    return owners.map((owner) => ({
      title: text(owner?.title) ?? 'Владелец',
      period: detailValue(owner?.details, 'Период владения'),
      duration: detailValue(owner?.details, 'Срок владения'),
      type: detailValue(owner?.details, 'Тип владельца'),
      region: detailValue(owner?.details, 'Место регистрации'),
    }));
  }

  private normalizeVehicleInfo(block: AnyRecord | undefined): Array<{ key: string; value: string }> {
    const cards = Array.isArray(block?.cards) ? block.cards : [];
    const pts = cards.find((c) => c?.name === 'ptsData');
    const specs = cards.find((c) => c?.name === 'vehicleSpecifications');
    const rows = [...(Array.isArray(pts?.list) ? pts.list : []), ...(Array.isArray(specs?.list) ? specs.list : [])];
    return rows
      .map((row) => ({ key: text(row?.key), value: text(row?.value) }))
      .filter((row): row is { key: string; value: string } => Boolean(row.key && row.value))
      .slice(0, 40);
  }
}
