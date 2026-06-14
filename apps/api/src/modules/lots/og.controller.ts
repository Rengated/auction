import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { fmt } from '@hermes/shared';
import { Public } from '../../common/decorators';
import { LotsService } from './lots.service';

/**
 * Отдаёт HTML с Open Graph-метатегами для краулеров соцсетей (Telegram/WhatsApp/VK…),
 * чтобы при шеринге ссылки на лот показывалась карточка с фото, названием и ценой.
 * Живых пользователей мгновенно редиректит на SPA-маршрут.
 * Caddy направляет сюда только запросы ботов соцсетей по User-Agent.
 */
@Controller('og')
export class OgController {
  constructor(private readonly lots: LotsService) {}

  private webOrigin(): string {
    return (process.env.WEB_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private page(opts: { title: string; description: string; image: string | null; url: string }): string {
    const { title, description, image, url } = opts;
    const img = image ? `<meta property="og:image" content="${this.esc(image)}">` : '';
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>${this.esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hermes Trade">
<meta property="og:title" content="${this.esc(title)}">
<meta property="og:description" content="${this.esc(description)}">
<meta property="og:url" content="${this.esc(url)}">
${img}
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${this.esc(url)}">
</head><body><script>location.replace(${JSON.stringify(url)})</script>
<a href="${this.esc(url)}">${this.esc(title)}</a></body></html>`;
  }

  @Public()
  @Get('home')
  @Header('Content-Type', 'text/html; charset=utf-8')
  home(@Res() res: Response) {
    res.send(
      this.page({
        title: 'Hermes Trade — онлайн-аукцион автомобилей',
        description: 'Живые торги: ставки в реальном времени, проверенные авто, сопровождение сделки.',
        image: `${this.webOrigin()}/pwa-512.png`,
        url: `${this.webOrigin()}/`,
      }),
    );
  }

  @Public()
  @Get('lots/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async lot(@Param('id') id: string, @Res() res: Response) {
    const web = this.webOrigin();
    try {
      const lot = await this.lots.byId(id, null);
      const title = `${lot.make} ${lot.model}, ${lot.year} — Hermes Trade`;
      const parts = [
        `${fmt(lot.currentPrice)} ₽`,
        `${fmt(lot.mileage)} км`,
        lot.address || null,
      ].filter(Boolean);
      res.send(
        this.page({
          title,
          description: parts.join(' · '),
          image: lot.photos[0]?.lg || `${web}/pwa-512.png`,
          url: `${web}/lots/${lot.id}`,
        }),
      );
    } catch {
      // лот не найден/снят — отдаём дефолтную карточку и редирект на каталог
      res.send(
        this.page({
          title: 'Hermes Trade — онлайн-аукцион автомобилей',
          description: 'Живые торги автомобилей.',
          image: `${web}/pwa-512.png`,
          url: `${web}/`,
        }),
      );
    }
  }
}
