export const prefectures = '北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県 海外'.split(' ').map((name,i)=>({name,code:String(i+1).padStart(2,'0')}));
export function jstDate(now=Date.now()) { return new Date(now+9*3600000).toISOString().slice(0,10); }
export function membershipNumber(code,now=Date.now()) {
  if(!prefectures.some(p=>p.code===code))throw new Error('お住まいを選択してください。');
  return 'F'+jstDate(now).slice(2).replaceAll('-','')+code;
}
export function validBirth(birth,now=Date.now()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(birth)&&birth>='1900-01-01'&&birth<=jstDate(now)&&!Number.isNaN(Date.parse(birth))&&new Date(birth).toISOString().slice(0,10)===birth;
}
