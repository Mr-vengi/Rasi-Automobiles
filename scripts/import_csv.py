import csv
import json
import re

with open('data/raw-products.csv', 'r', encoding='utf-8') as f:
    lines = f.readlines()

header_line_idx = 0
for idx, line in enumerate(lines):
    if 'Item Code' in line:
        header_line_idx = idx
        break

reader = csv.DictReader(lines[header_line_idx:])
products = []
categories = set()
brands = set()

for idx, row in enumerate(reader):
    code = (row.get('Item Code') or '').strip()
    raw_name = (row.get('Item Name') or '').strip()
    brand = (row.get('Brand') or '').strip()
    cat = (row.get('Category/Item Type') or '').strip()
    unit = (row.get('Unit') or '').strip()
    stock_val = row.get('Stock') or '0'
    alert_val = row.get('Alert Quantity') or '0'
    sales_val = row.get('Sales Price') or '0'
    tax_str = (row.get('Tax') or '').strip()
    status = (row.get('Status') or '').strip()

    try:
        stock = float(stock_val.replace(',', ''))
    except:
        stock = 0.0

    try:
        alert = float(alert_val.replace(',', ''))
    except:
        alert = 0.0

    try:
        sales_price = float(sales_val.replace(',', ''))
    except:
        sales_price = 0.0

    # Extract HSN if embedded
    hsn_match = re.search(r'HSN:\s*([0-9]+)', raw_name)
    hsn = hsn_match.group(1) if hsn_match else ''
    
    # Clean product name: remove HSN:.*SKU:.*
    name = re.sub(r'HSN:.*', '', raw_name).strip()
    name = re.sub(r'SKU:.*', '', name).strip()
    name = name.strip('\"').strip()

    # Clean category: remove [ITEM]
    cat_clean = re.sub(r'\[ITEM\]', '', cat, flags=re.IGNORECASE).strip()
    if cat_clean:
        categories.add(cat_clean)
    if brand:
        brands.add(brand)

    # Tax rate
    tax_rate = 18.0
    if '0.00' in tax_str or 'NO TAX' in tax_str.upper():
        tax_rate = 0.0
    elif '28.00' in tax_str:
        tax_rate = 28.0
    elif '12.00' in tax_str:
        tax_rate = 12.0
    elif '5.00' in tax_str:
        tax_rate = 5.0
    elif '18.00' in tax_str:
        tax_rate = 18.0

    # Unit mapping
    unit_map = {
        'NOS': 'Nos',
        'Pieces': 'Pieces',
        'LIT': 'Litre',
        'Mtr': 'Meter',
        'SETS': 'Set',
        'TIN': 'Tin'
    }
    unit_clean = unit_map.get(unit, unit if unit else 'Pieces')

    # Safe ID
    safe_code = re.sub(r'[^a-zA-Z0-9]', '-', code).lower().strip('-')
    prod_id = f"prod-{safe_code}-{idx+1}"

    prod = {
        'id': prod_id,
        'business_id': '00000000-0000-4000-8000-000000000001',
        'product_name': name,
        'sku': code,
        'part_number': code,
        'oem_number': '',
        'barcode': code,
        'brand_id': None,
        'brand_name': brand,
        'category_id': None,
        'category_name': cat_clean,
        'description': '',
        'unit': unit_clean,
        'purchase_price': 0,
        'selling_price': sales_price,
        'wholesale_price': sales_price,
        'mrp': sales_price,
        'gst_rate': tax_rate,
        'hsn_code': hsn or '8708',
        'current_stock': int(stock) if stock.is_integer() else stock,
        'minimum_stock': int(alert) if alert.is_integer() else alert,
        'maximum_stock': None,
        'shelf_location': '',
        'supplier_id': None,
        'is_active': status.lower() == 'active' or not status,
        'created_at': '2026-11-24T12:00:00.000Z',
        'updated_at': '2026-11-24T12:00:00.000Z',
        'archived_at': None
    }
    products.append(prod)

with open('data/products.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=2, ensure_ascii=False)

cat_list = [{'id': f'cat-{i+1}', 'business_id': '00000000-0000-4000-8000-000000000001', 'name': c, 'description': '', 'created_at': '2026-11-24T12:00:00.000Z'} for i, c in enumerate(sorted(categories))]
with open('data/categories.json', 'w', encoding='utf-8') as f:
    json.dump(cat_list, f, indent=2, ensure_ascii=False)

brand_list = [{'id': f'br-{i+1}', 'business_id': '00000000-0000-4000-8000-000000000001', 'name': b, 'created_at': '2026-11-24T12:00:00.000Z'} for i, b in enumerate(sorted(brands))]
with open('data/brands.json', 'w', encoding='utf-8') as f:
    json.dump(brand_list, f, indent=2, ensure_ascii=False)

print(f"Successfully processed {len(products)} products, {len(cat_list)} categories, {len(brand_list)} brands.")
