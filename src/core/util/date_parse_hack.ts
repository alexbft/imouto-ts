import { fixPattern } from 'core/util/misc';

export function parseNote(s: string): string {
  let dateRelated = /^(\d{1,2}.\d{1,2}.\d{2,4}|\d{1,4}|(янв)|(фев)|(мар)|(апр)|(мая)|(май)|(июн)|(июл)|(авг)|(сен)|(окт)|(ноя)|(дек)|(вчера)|(позавчера)|(сегодня)|(завтра)|(послезавтра)|(\d{1,2}ч|\d{1,2} ч)|(в \d{1,2}:\d{1,2})|(в\d{1,2}:\d{1,2})|(\d{2} ми)|(\d{2}ми)|(\d{1,2} \d{2}м)|(в \d{1,2})|(в\d{1,2})|(\d{1,2}:\d{1,2})|(дней|лет|нед|год|мес|день|дня|час|полчаса|мин|сек|\d{1,2}м|\d{1,2} м)|через|назад|(понед)|(вторн)|(сред)|(четв)|(пятн)|(субб)|(воскр))/;
  let note = s.replace("одиннадцать", "11").replace("двенадцать", "12").replace("тринадцать", "13").replace("четырнадцать", "14").replace("пятнадцать", "15").replace(" шестнадцать", " 16").replace(" семнадцать", " 17").replace(" двадцать", " 20").replace(" один", " 1").replace(" одну", " 1").replace(" два", " 2").replace(" две", " 2").replace(" три", " 3").replace(" четыре", " 4").replace(" пять", " 5").replace(" шесть", " 6").replace(" семь", " 7").replace("восемь", "8").replace("девять", "9").replace("десять", "10").replace(" ноль", " 0");
  note = note.replace(fixPattern(/\w+/g), (s) => dateRelated.test(s) ? '' : s);
  note = note.replace(fixPattern(/^\W+/), '').replace(/^что /i, '').replace(/^на /i, '');
  note = note.trim();
  if (note === '') {
    return 'Будильник';
  } else {
    return note;
  }
}
