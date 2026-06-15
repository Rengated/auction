import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERROR_CODES, minNextBid, type LotDto } from '@hermes/shared';
import { ApiError } from './api';
import { usePlaceBid, useMe } from './queries';
import { useUiStore } from './ui-store';

/**
 * Общая логика формы ставки для мобильного BidPanel и веб BidBox:
 * значение степпера, минимум, отправка, обработка BID_TOO_LOW / CONTACTS_REQUIRED.
 */
export function useBidForm(lot: LotDto) {
  const minNext = minNextBid(lot.currentPrice, lot.startPrice, lot.bidCount, lot.bidStep);
  const [value, setValue] = useState(minNext);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const place = usePlaceBid(lot.id);
  const { data: me } = useMe();
  const openAuthPrompt = useUiStore((s) => s.openAuthPrompt);
  const prevMin = useRef(minNext);

  // Цена выросла (перебили) — подтягиваем значение к новому минимуму
  useEffect(() => {
    if (minNext !== prevMin.current) {
      prevMin.current = minNext;
      setValue((v) => Math.max(v, minNext));
    }
  }, [minNext]);

  const tooLow = value < minNext;
  const contactsFilled = Boolean(me?.contactsFilled);

  const submit = () => {
    setError(null);
    if (!me) {
      openAuthPrompt('делать ставки');
      return;
    }
    if (!contactsFilled) {
      navigate('/profile/personal');
      return;
    }
    if (tooLow) {
      setValue(minNext);
      return;
    }
    place.mutate(
      { amount: value, clientBidId: crypto.randomUUID() },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => setDone(false), 2600);
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === ERROR_CODES.BID_TOO_LOW) {
            const min = Number(err.body.details?.minNextBid ?? minNext);
            setValue(min);
            setError(`Вас опередили — минимум теперь ${min.toLocaleString('ru-RU')} ₽`);
          } else if (err instanceof ApiError && err.code === ERROR_CODES.CONTACTS_REQUIRED) {
            navigate('/profile/personal');
          } else if (err instanceof ApiError && err.code === ERROR_CODES.ALREADY_LEADING) {
            setError('Ваша ставка уже лидирует');
          } else if (err instanceof ApiError && err.code === ERROR_CODES.LOT_NOT_LIVE) {
            setError('Торги по лоту завершены');
          } else {
            setError(err.message || 'Не удалось сделать ставку');
          }
        },
      },
    );
  };

  return { value, setValue, minNext, tooLow, done, error, submit, pending: place.isPending, contactsFilled, authed: Boolean(me) };
}
