export async function listAll(entity, sort = "-created_date", options = {}) {
  const {
    pageSize = 5000,
    maxPages = 50,
    fields,
  } = options;

  const all = [];

  for (let page = 0; page < maxPages; page += 1) {
    const skip = page * pageSize;
    const batch = await entity.list(sort, pageSize, skip, fields);
    const safeBatch = (batch || []).filter(Boolean);

    all.push(...safeBatch);

    if (safeBatch.length < pageSize) break;
  }

  return all;
}
