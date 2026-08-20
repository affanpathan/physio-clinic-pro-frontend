// Builds a { product_id, product_name, amount }[] breakdown from a daily_ledger row, handling
// both the new `product_lines` JSONB array shape and the legacy single product_id/product_name row.
export const getProductRows = (row) => {
  if (Array.isArray(row.product_lines) && row.product_lines.length) {
    return row.product_lines.map(l => ({
      product_id: l.product_id ?? null,
      product_name: l.product_name || l.description || 'Product',
      amount: Number(l.amount) || 0,
    }));
  }
  if (row.product_id || row.product_name) {
    return [{ product_id: row.product_id ?? null, product_name: row.product_name || row.description || 'Product', amount: Number(row.amount) || 0 }];
  }
  return [];
};
