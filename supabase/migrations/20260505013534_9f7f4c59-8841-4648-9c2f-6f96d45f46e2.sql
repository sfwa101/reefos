UPDATE public.sdui_layout_versions
SET blocks = '[
  {"id":"hero-bento","type":"bento_grid","props":{"title":"اختر وجهتك","items":[
    {"key":"supermarket","to":"/store/supermarket","size":"full","motif":"supermarket","tone":"emerald","title":"السوبر ماركت","subtitle":"كل احتياجاتك اليومية"},
    {"key":"village","to":"/store/village","size":"wide","motif":"village","tone":"lime","title":"منتجات القرية","subtitle":"حصرية وطازجة"},
    {"key":"dairy","to":"/store/dairy","size":"half","motif":"dairy","tone":"sky","title":"الألبان","subtitle":"يومية"},
    {"key":"produce","to":"/store/produce","size":"wide","motif":"produce","tone":"teal","title":"الخضار والفواكه","subtitle":"طازج يومياً"},
    {"key":"kitchen","to":"/store/kitchen","size":"half","motif":"kitchen","tone":"orange","title":"مطبخ ريف","subtitle":"وجبات اليوم"},
    {"key":"meat","to":"/store/meat","size":"wide","motif":"meat","tone":"rose","title":"اللحوم","subtitle":"طازجة ومجهزة"},
    {"key":"sweets","to":"/store/sweets","size":"half","motif":"sweets","tone":"pink","title":"الحلويات","subtitle":"شرقية وغربية"}
  ]}},
  {"id":"supermarket-cats","type":"smart_rail","props":{"title":"تصنيفات السوبر ماركت","items":[
    {"key":"rice","to":"/store/supermarket","emoji":"🍚","title":"أرز وبقالة"},
    {"key":"cans","to":"/store/supermarket","emoji":"🥫","title":"معلبات"},
    {"key":"snacks","to":"/store/supermarket","emoji":"🍿","title":"تسالي"},
    {"key":"drinks","to":"/store/supermarket","emoji":"🥤","title":"مشروبات"},
    {"key":"breakfast","to":"/store/supermarket","emoji":"🥐","title":"فطور"},
    {"key":"frozen","to":"/store/supermarket","emoji":"🧊","title":"مجمدات"},
    {"key":"bakery","to":"/store/supermarket","emoji":"🥖","title":"مخبوزات"}
  ]}},
  {"id":"curated-experiences","type":"bento_grid","props":{"title":"تجارب مختارة","items":[
    {"key":"restaurants","to":"/store/restaurants","size":"full","motif":"restaurants","tone":"amber","title":"مطاعم مختارة","subtitle":"ألذ الوجبات بانتظارك"},
    {"key":"pharmacy","to":"/store/pharmacy","size":"wide","motif":"pharmacy","tone":"sky","title":"الصيدلية","subtitle":"صحتك أولويتنا"},
    {"key":"library","to":"/store/library","size":"half","motif":"library","tone":"indigo","title":"مكتبة الطلبة"},
    {"key":"home","to":"/store/home","size":"half","motif":"home","tone":"violet","title":"أدوات المنزل"},
    {"key":"gifts","to":"/store/baskets","size":"half","motif":"gifts","tone":"fuchsia","title":"الهدايا والتغليف"},
    {"key":"recipes","to":"/store/recipes","size":"half","motif":"recipes","tone":"orange","title":"وصفات الشيف"}
  ]}}
]'::jsonb
WHERE id = 'd8239b09-1574-4b38-a4f8-c1ab277deca3';