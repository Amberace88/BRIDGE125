import type { Strings } from './pick';
import type { OrderStatus } from '../merch/orders';

/** Profile → My orders (merch). Not a registered FeaturePack module: languages other than these fall back to English. */
export interface MerchOrderStrings {
  title: string;
  sub: string;
  status: Record<OrderStatus, string>;
  steps: [string, string, string, string];
  order: (id: string) => string;
  items: (n: number) => string;
  total: string;
  track: string;
  trackNo: string;
  shipped: string;
  delivered: string;
  help: string;
  more: string;
  less: string;
}

const en: MerchOrderStrings = {
  title: 'My orders',
  sub: 'Bridge 125 merch — made to order for you',
  status: { paid: 'Paid', processing: 'In production', partially_shipped: 'Partly shipped', shipped: 'Shipped', delivered: 'Delivered', canceled: 'Cancelled', refunded: 'Refunded' },
  steps: ['Paid', 'In production', 'Shipped', 'Delivered'],
  order: id => `Order ${id}`,
  items: n => `${n} ${n === 1 ? 'item' : 'items'}`,
  total: 'Total',
  track: 'Track parcel',
  trackNo: 'Tracking no.',
  shipped: 'Shipped',
  delivered: 'Delivered',
  help: 'Questions about an order? Write to',
  more: 'Details',
  less: 'Hide',
};

const lv: MerchOrderStrings = {
  title: 'Mani pasūtījumi',
  sub: 'Bridge 125 preces — izgatavotas tieši tev',
  status: { paid: 'Apmaksāts', processing: 'Izgatavo', partially_shipped: 'Daļēji nosūtīts', shipped: 'Nosūtīts', delivered: 'Piegādāts', canceled: 'Atcelts', refunded: 'Atmaksāts' },
  steps: ['Apmaksāts', 'Izgatavo', 'Nosūtīts', 'Piegādāts'],
  order: id => `Pasūtījums ${id}`,
  items: n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'prece' : 'preces'}`,
  total: 'Kopā',
  track: 'Sekot sūtījumam',
  trackNo: 'Sūtījuma nr.',
  shipped: 'Nosūtīts',
  delivered: 'Piegādāts',
  help: 'Jautājumi par pasūtījumu? Raksti uz',
  more: 'Sīkāk',
  less: 'Slēpt',
};

const ru: MerchOrderStrings = {
  title: 'Мои заказы',
  sub: 'Мерч Bridge 125 — изготавливается под ваш заказ',
  status: { paid: 'Оплачен', processing: 'В производстве', partially_shipped: 'Частично отправлен', shipped: 'Отправлен', delivered: 'Доставлен', canceled: 'Отменён', refunded: 'Возвращён' },
  steps: ['Оплачен', 'Производство', 'Отправлен', 'Доставлен'],
  order: id => `Заказ ${id}`,
  items: n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'товар' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'товара' : 'товаров'}`,
  total: 'Итого',
  track: 'Отследить посылку',
  trackNo: 'Трек-номер',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  help: 'Вопросы по заказу? Пишите на',
  more: 'Подробнее',
  less: 'Скрыть',
};

const uk: MerchOrderStrings = {
  title: 'Мої замовлення',
  sub: 'Мерч Bridge 125 — виготовляється під ваше замовлення',
  status: { paid: 'Оплачено', processing: 'У виробництві', partially_shipped: 'Частково відправлено', shipped: 'Відправлено', delivered: 'Доставлено', canceled: 'Скасовано', refunded: 'Повернено' },
  steps: ['Оплачено', 'Виробництво', 'Відправлено', 'Доставлено'],
  order: id => `Замовлення ${id}`,
  items: n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'товар' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'товари' : 'товарів'}`,
  total: 'Разом',
  track: 'Відстежити посилку',
  trackNo: 'Трек-номер',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  help: 'Питання щодо замовлення? Пишіть на',
  more: 'Докладніше',
  less: 'Сховати',
};

export const MERCH_ORDER_STRINGS: Strings<MerchOrderStrings> = { en, lv, ru, uk };
