// In-memory store of processed images keyed by image id.
// For multi-instance/production use, replace with Redis or a DB.
const items = new Map();

export function put(item) {
  items.set(item.id, item);
}

export function get(id) {
  return items.get(id);
}

export function getMany(ids) {
  return ids.map((id) => items.get(id)).filter(Boolean);
}

export function remove(id) {
  items.delete(id);
}

export function all() {
  return Array.from(items.values());
}
