import slugifyLib from 'slugify';
export const slugify = (str) =>
  slugifyLib(str, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }).slice(0, 80);
