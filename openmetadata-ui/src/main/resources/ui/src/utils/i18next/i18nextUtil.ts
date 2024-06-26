/*
 *  Copyright 2022 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { InitOptions } from 'i18next';
import { map, upperCase } from 'lodash';
import deDe from '../../locale/languages/de-de.json';
import enUS from '../../locale/languages/en-us.json';
import esES from '../../locale/languages/es-es.json';
import frFR from '../../locale/languages/fr-fr.json';
import heHE from '../../locale/languages/he-he.json';
import jaJP from '../../locale/languages/ja-jp.json';
import nlNL from '../../locale/languages/nl-nl.json';
import ptBR from '../../locale/languages/pt-br.json';
import ruRU from '../../locale/languages/ru-ru.json';
import zhCN from '../../locale/languages/zh-cn.json';

export enum SupportedLocales {
  English = 'en-US',
  Français = 'fr-FR',
  简体中文 = 'zh-CN',
  日本語 = 'ja-JP',
  Português = 'pt-BR',
  Español = 'es-ES',
  Русский = 'ru-RU',
  Deutsch = 'de-DE',
  Hebrew = 'he-HE',
  Nederlands = 'nl-NL',
}

export const languageSelectOptions = map(SupportedLocales, (value, key) => ({
  label: `${key} - ${upperCase(value.split('-')[0])}`,
  key: value,
}));

// Returns i18next options
export const getInitOptions = (): InitOptions => {
  return {
    supportedLngs: Object.values(SupportedLocales),
    resources: {
      'en-US': { translation: enUS },
      'fr-FR': { translation: frFR },
      'zh-CN': { translation: zhCN },
      'ja-JP': { translation: jaJP },
      'pt-BR': { translation: ptBR },
      'es-ES': { translation: esES },
      'ru-RU': { translation: ruRU },
      'de-DE': { translation: deDe },
      'he-HE': { translation: heHE },
      'nl-NL': { translation: nlNL },
    },
    fallbackLng: ['zh-CN'],
    detection: {
      order: ['cookie'],
      caches: ['cookie'], // cache user language on
    },
    interpolation: {
      escapeValue: false, // XSS safety provided by React
    },
    missingKeyHandler: (_lngs, _ns, key) =>
      // eslint-disable-next-line no-console
      console.error(`i18next: key not found "${key}"`),
    saveMissing: true, // Required for missing key handler
  };
};
