import type { Strings } from './pick';
import type { MediaError } from '../media/mesh';
import type { AvatarErr } from '../media/avatar';

export interface MediaStrings {
  camOn: string; camOff: string; micOn: string; micOff: string; hide: string; show: string;
  tapToHear: string; connecting: string; you: string; live: (n: number) => string;
  err: Record<MediaError, string>;
  joinWith: string; joinSub: string; camera: string; mic: string;
  photo: string; addPhoto: string; changePhoto: string; removePhoto: string; photoSignin: string;
  cropTitle: string; cropHint: string; zoom: string; usePhoto: string; cancel: string; uploading: string; photoSaved: string; photoRemoved: string;
  avErr: Record<AvatarErr, string>;
  music: string; musicSub: string; volume: string;
}

export const MEDIA: Strings<MediaStrings> = {
  en: {
    camOn: 'Turn camera on', camOff: 'Turn camera off', micOn: 'Unmute microphone', micOff: 'Mute microphone', hide: 'Minimise video', show: 'Show video',
    tapToHear: 'Tap to hear the table', connecting: 'Connecting…', you: 'You', live: n => `${n} live`,
    err: {
      denied: 'Camera / mic access is blocked — allow it in your browser settings.',
      nodevice: 'No camera or microphone found.',
      unsupported: 'Video chat is not supported in this browser.',
      busy: 'Your camera is being used by another app.',
      generic: 'Could not start camera or microphone.',
    },
    joinWith: 'Join with camera & mic', joinSub: 'Off by default — only players at this table see and hear you.', camera: 'Camera', mic: 'Microphone',
    photo: 'Photo', addPhoto: 'Add a photo', changePhoto: 'Change photo', removePhoto: 'Remove photo', photoSignin: 'Sign in to use your own photo.',
    cropTitle: 'Frame your photo', cropHint: 'Drag to move · pinch or scroll to zoom', zoom: 'Zoom', usePhoto: 'Use photo', cancel: 'Cancel', uploading: 'Uploading…',
    photoSaved: 'Photo saved', photoRemoved: 'Photo removed',
    avErr: {
      signin: 'Sign in to use your own photo.', setup: 'Photo uploads are not set up yet.', size: 'That image is too large.',
      type: 'That file is not a supported image (try JPEG or PNG).', network: 'No connection — try again.', denied: 'Upload was refused.', generic: 'Something went wrong — try again.',
    },
    music: 'Music', musicSub: 'Late-night lounge, composed live', volume: 'Volume',
  },
  lv: {
    camOn: 'Ieslēgt kameru', camOff: 'Izslēgt kameru', micOn: 'Ieslēgt mikrofonu', micOff: 'Izslēgt mikrofonu', hide: 'Minimizēt video', show: 'Rādīt video',
    tapToHear: 'Pieskaries, lai dzirdētu galdu', connecting: 'Savienojas…', you: 'Tu', live: n => `${n} tiešsaistē`,
    err: {
      denied: 'Piekļuve kamerai / mikrofonam ir bloķēta — atļauj to pārlūka iestatījumos.',
      nodevice: 'Kamera vai mikrofons nav atrasts.',
      unsupported: 'Šis pārlūks neatbalsta video čatu.',
      busy: 'Kameru izmanto cita lietotne.',
      generic: 'Neizdevās ieslēgt kameru vai mikrofonu.',
    },
    joinWith: 'Pievienoties ar kameru un mikrofonu', joinSub: 'Pēc noklusējuma izslēgts — tevi redz un dzird tikai šī galda spēlētāji.', camera: 'Kamera', mic: 'Mikrofons',
    photo: 'Foto', addPhoto: 'Pievienot foto', changePhoto: 'Mainīt foto', removePhoto: 'Noņemt foto', photoSignin: 'Pieraksties, lai izmantotu savu foto.',
    cropTitle: 'Iekadrē savu foto', cropHint: 'Velc, lai pārvietotu · savelc vai ritini, lai tuvinātu', zoom: 'Tuvinājums', usePhoto: 'Izmantot foto', cancel: 'Atcelt', uploading: 'Augšupielādē…',
    photoSaved: 'Foto saglabāts', photoRemoved: 'Foto noņemts',
    avErr: {
      signin: 'Pieraksties, lai izmantotu savu foto.', setup: 'Foto augšupielāde vēl nav iestatīta.', size: 'Attēls ir pārāk liels.',
      type: 'Šis fails nav atbalstīts attēls (mēģini JPEG vai PNG).', network: 'Nav savienojuma — mēģini vēlreiz.', denied: 'Augšupielāde noraidīta.', generic: 'Kaut kas nogāja greizi — mēģini vēlreiz.',
    },
    music: 'Mūzika', musicSub: 'Vēla vakara lounge, komponēts tiešraidē', volume: 'Skaļums',
  },
  ru: {
    camOn: 'Включить камеру', camOff: 'Выключить камеру', micOn: 'Включить микрофон', micOff: 'Выключить микрофон', hide: 'Свернуть видео', show: 'Показать видео',
    tapToHear: 'Нажмите, чтобы слышать стол', connecting: 'Соединение…', you: 'Вы', live: n => `${n} в эфире`,
    err: {
      denied: 'Доступ к камере / микрофону заблокирован — разрешите его в настройках браузера.',
      nodevice: 'Камера или микрофон не найдены.',
      unsupported: 'Этот браузер не поддерживает видеочат.',
      busy: 'Камера занята другим приложением.',
      generic: 'Не удалось включить камеру или микрофон.',
    },
    joinWith: 'Войти с камерой и микрофоном', joinSub: 'По умолчанию выключено — вас видят и слышат только игроки этого стола.', camera: 'Камера', mic: 'Микрофон',
    photo: 'Фото', addPhoto: 'Добавить фото', changePhoto: 'Сменить фото', removePhoto: 'Удалить фото', photoSignin: 'Войдите, чтобы поставить своё фото.',
    cropTitle: 'Выберите кадр', cropHint: 'Перетащите · щипок или колесо — масштаб', zoom: 'Масштаб', usePhoto: 'Готово', cancel: 'Отмена', uploading: 'Загрузка…',
    photoSaved: 'Фото сохранено', photoRemoved: 'Фото удалено',
    avErr: {
      signin: 'Войдите, чтобы поставить своё фото.', setup: 'Загрузка фото ещё не настроена.', size: 'Изображение слишком большое.',
      type: 'Этот файл не поддерживается (попробуйте JPEG или PNG).', network: 'Нет соединения — попробуйте ещё раз.', denied: 'Загрузка отклонена.', generic: 'Что-то пошло не так — попробуйте ещё раз.',
    },
    music: 'Музыка', musicSub: 'Ночной лаунж, сочиняется вживую', volume: 'Громкость',
  },
  uk: {
    camOn: 'Увімкнути камеру', camOff: 'Вимкнути камеру', micOn: 'Увімкнути мікрофон', micOff: 'Вимкнути мікрофон', hide: 'Згорнути відео', show: 'Показати відео',
    tapToHear: 'Торкніться, щоб чути стіл', connecting: "З'єднання…", you: 'Ви', live: n => `${n} в ефірі`,
    err: {
      denied: 'Доступ до камери / мікрофона заблоковано — дозвольте його в налаштуваннях браузера.',
      nodevice: 'Камеру або мікрофон не знайдено.',
      unsupported: 'Цей браузер не підтримує відеочат.',
      busy: 'Камера зайнята іншою програмою.',
      generic: 'Не вдалося увімкнути камеру або мікрофон.',
    },
    joinWith: 'Увійти з камерою та мікрофоном', joinSub: 'Типово вимкнено — вас бачать і чують лише гравці цього столу.', camera: 'Камера', mic: 'Мікрофон',
    photo: 'Фото', addPhoto: 'Додати фото', changePhoto: 'Змінити фото', removePhoto: 'Видалити фото', photoSignin: 'Увійдіть, щоб поставити своє фото.',
    cropTitle: 'Оберіть кадр', cropHint: 'Перетягніть · щипок або коліщатко — масштаб', zoom: 'Масштаб', usePhoto: 'Готово', cancel: 'Скасувати', uploading: 'Завантаження…',
    photoSaved: 'Фото збережено', photoRemoved: 'Фото видалено',
    avErr: {
      signin: 'Увійдіть, щоб поставити своє фото.', setup: 'Завантаження фото ще не налаштовано.', size: 'Зображення завелике.',
      type: 'Цей файл не підтримується (спробуйте JPEG або PNG).', network: "Немає з'єднання — спробуйте ще раз.", denied: 'Завантаження відхилено.', generic: 'Щось пішло не так — спробуйте ще раз.',
    },
    music: 'Музика', musicSub: 'Нічний лаунж, створюється наживо', volume: 'Гучність',
  },
};
