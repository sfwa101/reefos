#!/usr/bin/env python3
"""
Salsabil Runtime Catalog Seeder — Wave 2.D.

Deterministic + idempotent SQL generator for the `usa_products` runtime
schema. Produces ~190 products across 12 sections with:
  • i18n names/descriptions
  • base + compare-at prices
  • hero + 3 gallery media
  • capability-driven extras (variants/addons/nutrition)
  • a relation graph (related/complementary/substitute) per section

Output: scripts/out/seed-runtime-catalog.sql
Run via: psql -f scripts/out/seed-runtime-catalog.sql
"""
from __future__ import annotations
import os, json, hashlib, random
from pathlib import Path

OUT = Path(__file__).parent / "out" / "seed-runtime-catalog.sql"
OUT.parent.mkdir(parents=True, exist_ok=True)

# ─── Catalog definition (data only — zero hardcoded UI logic) ────────────
# Each entry: (slug-fragment, name_ar, name_en, base, compare_at|None, badges, tags)
CATALOG: dict[str, dict] = {
    "produce": {
        "image_query": ["fresh-fruit","tomato","cucumber","lettuce","apple","banana","grape","mango","strawberry","orange","onion","carrot","pepper","watermelon","spinach","broccoli"],
        "items": [
            ("tomato",   "طماطم بلدي",     "Local Tomato",      18, None, ["fresh","local"], ["vegetable","red"]),
            ("cucumber", "خيار",            "Cucumber",          12, None, ["fresh"], ["vegetable","green"]),
            ("apple-red","تفاح أحمر",       "Red Apple",         55, 65,   ["imported"], ["fruit","sweet"]),
            ("banana",   "موز مصري",        "Egyptian Banana",   28, None, ["local"], ["fruit","sweet"]),
            ("mango",    "مانجو عويس",      "Owais Mango",       80, 95,   ["seasonal","premium"], ["fruit","seasonal"]),
            ("orange",   "برتقال أبو سرة",  "Navel Orange",      22, None, ["fresh"], ["fruit","citrus"]),
            ("grape",    "عنب بناتي",       "Banati Grape",      45, 55,   ["seasonal"], ["fruit","sweet"]),
            ("strawberry","فراولة",         "Strawberry",        35, 45,   ["fresh","seasonal"], ["fruit","red"]),
            ("watermelon","بطيخ صعيدي",     "Saidi Watermelon",  40, None, ["seasonal","large"], ["fruit","summer"]),
            ("lettuce",  "خس بلدي",         "Local Lettuce",     10, None, ["fresh"], ["vegetable","green","leafy"]),
            ("spinach",  "سبانخ طازجة",     "Fresh Spinach",     15, None, ["fresh","healthy"], ["vegetable","leafy"]),
            ("carrot",   "جزر",              "Carrot",            14, None, ["fresh"], ["vegetable","orange"]),
            ("pepper-green","فلفل أخضر",    "Green Pepper",      20, None, ["fresh"], ["vegetable"]),
            ("onion",    "بصل بلدي",        "Local Onion",       11, None, ["essential"], ["vegetable"]),
            ("potato",   "بطاطس",           "Potato",            13, None, ["essential"], ["vegetable"]),
            ("garlic",   "ثوم",              "Garlic",            45, None, [], ["vegetable","spice"]),
        ],
    },
    "home-goods": {
        "image_query": ["rice","pasta","oil","sugar","flour","tea","coffee","spice","canned-food","grocery","cereal","jam","honey","vinegar","salt","beans"],
        "items": [
            ("rice-egyptian","أرز مصري",     "Egyptian Rice 1kg",  35, 42,   ["best-seller"], ["grain","staple"]),
            ("pasta-spaghetti","مكرونة سباجتي","Spaghetti 500g",    18, None, [], ["pasta","staple"]),
            ("oil-sunflower","زيت دوار شمس",  "Sunflower Oil 1L",   65, 75,   ["best-seller"], ["oil","cooking"]),
            ("sugar-white","سكر أبيض",       "White Sugar 1kg",    32, None, ["essential"], ["sweetener"]),
            ("flour-72","دقيق فاخر 72%",     "Fine Flour 72% 1kg", 20, None, ["essential"], ["baking","staple"]),
            ("tea-lipton","شاي ليبتون",      "Lipton Tea 100g",    55, None, [], ["beverage","hot"]),
            ("coffee-arabic","قهوة عربي",    "Arabic Coffee 250g", 95, 110,  ["traditional"], ["beverage","hot"]),
            ("salt-table","ملح طعام",        "Table Salt 750g",    8,  None, ["essential"], ["seasoning"]),
            ("vinegar","خل أبيض",            "White Vinegar 1L",   18, None, [], ["cooking"]),
            ("beans-fava","فول مدمس",        "Fava Beans 800g",    28, None, ["traditional"], ["canned","protein"]),
            ("lentils-red","عدس أحمر",       "Red Lentils 1kg",    42, None, ["healthy"], ["grain","protein"]),
            ("chickpeas","حمص",              "Chickpeas 1kg",      38, None, [], ["grain","protein"]),
            ("honey-bee","عسل نحل طبيعي",    "Natural Honey 500g", 220,260, ["premium","natural"], ["sweetener"]),
            ("jam-strawberry","مربى فراولة","Strawberry Jam 340g",45, None, [], ["sweet","breakfast"]),
            ("cocoa-powder","كاكاو خام",     "Cocoa Powder 100g",  35, None, [], ["baking"]),
            ("yeast-dry","خميرة فورية",      "Instant Yeast 100g", 14, None, [], ["baking"]),
        ],
    },
    "dairy": {
        "image_query": ["milk","cheese","yogurt","butter","cream","feta","mozzarella","greek-yogurt","labneh","white-cheese","kashkawan","ghee","laban","ricotta"],
        "items": [
            ("milk-full","حليب كامل الدسم 1ل","Full-Fat Milk 1L",  32, None, ["fresh","cold"], ["dairy"]),
            ("milk-skim","حليب خالي الدسم 1ل","Skim Milk 1L",      30, None, ["healthy"], ["dairy","light"]),
            ("yogurt-plain","زبادي طبيعي",   "Plain Yogurt 170g",  9,  None, ["fresh"], ["dairy","probiotic"]),
            ("greek-yogurt","زبادي يوناني",  "Greek Yogurt 200g",  22, None, ["healthy","high-protein"], ["dairy"]),
            ("feta","جبنة فيتا",             "Feta Cheese 200g",   55, None, [], ["cheese"]),
            ("mozzarella","موتزاريلا",       "Mozzarella 200g",    78, 92,   ["pizza"], ["cheese","melty"]),
            ("labneh","لبنة",                "Labneh 350g",        45, None, ["traditional"], ["cheese","spread"]),
            ("cheddar","شيدر مبشور",         "Shredded Cheddar 200g",62,72,["sandwich"], ["cheese"]),
            ("butter","زبدة طبيعية",         "Natural Butter 200g",55, None, [], ["dairy","spread"]),
            ("cream-fresh","قشطة طازجة",     "Fresh Cream 200ml",  35, None, [], ["dairy","dessert"]),
            ("ghee","سمن بقري",              "Cow Ghee 800g",      295,340, ["premium","traditional"], ["dairy","cooking"]),
            ("laban","لبن رايب",             "Buttermilk 1L",      28, None, ["traditional"], ["dairy"]),
            ("kashkawan","قشقوان",            "Kashkawan 250g",     85, None, [], ["cheese"]),
            ("white-cheese","جبنة بيضاء",    "White Cheese 500g",  78, None, ["traditional"], ["cheese"]),
            ("ricotta","ريكوتا",             "Ricotta 250g",       58, None, [], ["cheese","light"]),
            ("milk-uht","حليب طويل الأجل",   "UHT Milk 1L",        28, None, [], ["dairy","ambient"]),
        ],
    },
    "bakery": {
        "image_query": ["bread","baguette","croissant","pita","cake","muffin","brioche","sourdough","danish","bagel","cookie","pretzel","focaccia","roll","biscotti","scone"],
        "items": [
            ("bread-baladi","عيش بلدي",       "Baladi Bread x10",  10, None, ["fresh","daily"], ["bread","staple"]),
            ("bread-fino","عيش فينو",         "Fino Bread x4",     15, None, ["fresh"], ["bread"]),
            ("baguette","باجيت فرنسي",        "French Baguette",   18, None, ["fresh"], ["bread"]),
            ("croissant-butter","كرواسون زبدة","Butter Croissant", 22, None, ["pastry"], ["bread","sweet"]),
            ("croissant-choco","كرواسون شوكولا","Chocolate Croissant",26,None,["pastry"], ["bread","sweet"]),
            ("brioche","خبز بريوش",           "Brioche Loaf",      35, None, ["pastry"], ["bread","sweet"]),
            ("sourdough","خبز عجين مخمر",     "Sourdough Loaf",    48, 58,   ["artisan"], ["bread","healthy"]),
            ("pita","خبز بيتا",                "Pita Bread x6",     12, None, [], ["bread"]),
            ("cake-vanilla","كيك فانيليا",    "Vanilla Cake",      85, None, ["dessert"], ["cake","sweet"]),
            ("muffin-blueberry","مافن توت",   "Blueberry Muffin",  18, None, [], ["pastry","sweet"]),
            ("danish-apple","دانش تفاح",      "Apple Danish",      22, None, ["pastry"], ["sweet"]),
            ("bagel-sesame","خبز بيجل سمسم",  "Sesame Bagel x4",   28, None, [], ["bread"]),
            ("cookies-choco","كوكيز شوكولا",  "Chocolate Cookies", 35, None, [], ["sweet"]),
            ("focaccia","فوكاتشيا أعشاب",     "Herb Focaccia",     45, None, ["artisan"], ["bread","savory"]),
            ("scone-cream","سكون كريمة",      "Cream Scone x4",    32, None, [], ["pastry"]),
            ("pretzel-soft","بريتزل ناعم",    "Soft Pretzel",      18, None, [], ["bread"]),
        ],
    },
    "beverages": {
        "image_query": ["water","juice","soda","cola","tea-bottle","energy-drink","coffee-bottle","lemonade","mineral-water","orange-juice","apple-juice","mango-juice","sparkling-water","iced-tea","coconut-water","milk-bottle"],
        "items": [
            ("water-1l","مياه معدنية 1ل",     "Mineral Water 1L",  6,  None, ["essential"], ["water"]),
            ("water-pack","مياه 6×1.5ل",       "Water Pack 6×1.5L", 48, 56,   ["bulk"], ["water","family"]),
            ("juice-orange","عصير برتقال",    "Orange Juice 1L",   42, None, ["fresh"], ["juice"]),
            ("juice-mango","عصير مانجو",      "Mango Juice 1L",    48, None, ["fresh"], ["juice"]),
            ("juice-apple","عصير تفاح",       "Apple Juice 1L",    38, None, [], ["juice"]),
            ("cola-1.5","كولا 1.5ل",          "Cola 1.5L",         28, 32,   [], ["soda"]),
            ("seven-up","سفن أب 1.5ل",        "7-Up 1.5L",         28, None, [], ["soda"]),
            ("sparkling","ماء غازي",          "Sparkling Water",   12, None, [], ["water"]),
            ("iced-tea-peach","شاي مثلج خوخ", "Peach Iced Tea",    18, None, [], ["tea","cold"]),
            ("energy","مشروب طاقة 250مل",     "Energy Drink 250ml",35, None, ["caffeine"], ["energy"]),
            ("coconut-water","ماء جوز هند",   "Coconut Water 330ml",28,None, ["healthy","natural"], ["healthy"]),
            ("lemonade","عصير ليمون",         "Lemonade 1L",       32, None, [], ["juice"]),
            ("milk-choc","حليب شوكولا 250مل","Chocolate Milk 250ml",12,None,[], ["dairy","sweet"]),
            ("coffee-cold","قهوة مثلجة",      "Cold Brew Coffee",  38, None, ["caffeine"], ["coffee","cold"]),
            ("ginger-ale","جينجر إيل",        "Ginger Ale 330ml",  16, None, [], ["soda"]),
            ("pomegranate","عصير رمان",       "Pomegranate Juice", 55, None, ["healthy","premium"], ["juice"]),
        ],
    },
    "snacks": {
        "image_query": ["chips","chocolate","biscuit","crackers","nuts","popcorn","candy","granola","dried-fruit","gum","wafer","cookie","pretzel","trail-mix","jerky","pop-tart"],
        "items": [
            ("chips-salt","شيبسي ملح",        "Salted Chips 90g",  12, None, [], ["chips"]),
            ("chips-bbq","شيبسي بربكيو",      "BBQ Chips 90g",     12, None, [], ["chips"]),
            ("choc-bar","لوح شوكولا 100جم",   "Chocolate Bar 100g",22, None, [], ["sweet","chocolate"]),
            ("biscuit-tea","بسكويت شاي",      "Tea Biscuit 200g",  18, None, [], ["sweet"]),
            ("crackers-salty","كراكرز ملح",   "Salty Crackers 200g",22,None, [], ["savory"]),
            ("nuts-mixed","مكسرات مشكلة 200جم","Mixed Nuts 200g",  85, 99,   ["healthy","premium"], ["nuts"]),
            ("almonds","لوز محمص 150جم",      "Roasted Almonds 150g",75,None,["healthy"], ["nuts"]),
            ("popcorn-butter","فشار بالزبدة","Butter Popcorn 100g",18,None, [], ["snack"]),
            ("granola-bar","بار جرانولا",     "Granola Bar 40g",   12, None, ["healthy"], ["bar","sweet"]),
            ("dried-figs","تين مجفف 200جم",   "Dried Figs 200g",   65, None, ["healthy","natural"], ["dried-fruit"]),
            ("dates-medjool","تمر مجدول 250جم","Medjool Dates 250g",95,None,["premium","natural"], ["sweet","dried-fruit"]),
            ("gum-mint","علكة نعناع",         "Mint Gum",          8,  None, [], ["candy"]),
            ("wafer-choc","ويفر شوكولا",      "Chocolate Wafer",   10, None, [], ["sweet"]),
            ("trail-mix","تشكيلة مكسرات وفواكه","Trail Mix 200g", 88, None, ["healthy"], ["nuts","dried-fruit"]),
            ("pretzel-pack","بريتزل صغير 80جم","Mini Pretzels 80g",15,None, [], ["snack"]),
            ("cookie-oat","كوكيز شوفان",      "Oat Cookie 60g",    14, None, ["healthy"], ["sweet"]),
        ],
    },
    "household": {
        "image_query": ["detergent","soap","tissue","cleaner","sponge","bleach","dish-soap","laundry","trash-bag","glass-cleaner","floor-cleaner","air-freshener","bath-tissue","paper-towel","fabric-softener","dish-tab"],
        "items": [
            ("laundry-powder","مسحوق غسيل 3كجم","Laundry Powder 3kg",185,210,["best-seller"], ["laundry"]),
            ("laundry-liquid","سائل غسيل 2ل",  "Liquid Detergent 2L",165,None,["concentrated"], ["laundry"]),
            ("dish-liquid","سائل أطباق 1ل",   "Dish Liquid 1L",    45, 55,   [], ["dish"]),
            ("dish-tabs","أقراص غسالة أطباق", "Dishwasher Tabs x40",195,None,[], ["dish"]),
            ("bleach","كلور",                  "Bleach 2L",         32, None, [], ["cleaner"]),
            ("floor-cleaner","منظف أرضيات 2ل","Floor Cleaner 2L",  58, None, [], ["cleaner"]),
            ("glass-cleaner","منظف زجاج 750مل","Glass Cleaner 750ml",38,None,[], ["cleaner"]),
            ("air-freshener","معطر جو",       "Air Freshener 300ml",45,None,[], ["freshener"]),
            ("toilet-paper","ورق تواليت ×8",  "Toilet Paper x8",   68, 78,   ["bulk"], ["paper"]),
            ("tissue-box","مناديل ورق ×3",    "Tissue Box x3",     38, None, [], ["paper"]),
            ("paper-towel","مناشف ورقية ×2",  "Paper Towels x2",   42, None, [], ["paper"]),
            ("trash-bag","أكياس قمامة 100ل",  "Trash Bags 100L x10",28,None,[], ["bag"]),
            ("sponge-pack","أسفنج جلي ×6",    "Dish Sponge x6",    22, None, [], ["dish"]),
            ("hand-soap","صابون يد 500مل",    "Hand Soap 500ml",   38, None, ["antibacterial"], ["soap"]),
            ("fabric-softener","منعم ملابس 2ل","Fabric Softener 2L",65,None,[], ["laundry"]),
            ("multi-cleaner","منظف متعدد 1ل", "Multi Cleaner 1L",  48, None, [], ["cleaner"]),
        ],
    },
    "frozen": {
        "image_query": ["frozen-pizza","ice-cream","frozen-vegetables","frozen-fish","frozen-chicken","frozen-fries","frozen-corn","frozen-peas","frozen-burger","frozen-shrimp","frozen-meal","frozen-fruit","frozen-dessert","frozen-pastry","frozen-meat","frozen-okra"],
        "items": [
            ("pizza-pepperoni","بيتزا بيبروني مجمدة","Frozen Pepperoni Pizza",95,115,[], ["frozen","meal"]),
            ("pizza-margherita","بيتزا مارجريتا مجمدة","Frozen Margherita",85,None,[],["frozen","meal"]),
            ("ice-cream-vanilla","آيس كريم فانيليا 1ل","Vanilla Ice Cream 1L",78,None,[],["frozen","dessert"]),
            ("ice-cream-choc","آيس كريم شوكولا 1ل","Chocolate Ice Cream 1L",78,None,[],["frozen","dessert"]),
            ("fries-frozen","بطاطس مقلية مجمدة 1كجم","Frozen Fries 1kg",55,68,[], ["frozen"]),
            ("peas-frozen","بسلة مجمدة 400جم","Frozen Peas 400g",  28, None, [], ["frozen","vegetable"]),
            ("corn-frozen","ذرة مجمدة 400جم", "Frozen Corn 400g",  32, None, [], ["frozen","vegetable"]),
            ("okra-frozen","بامية مجمدة 400جم","Frozen Okra 400g", 35, None, ["traditional"], ["frozen","vegetable"]),
            ("mixed-veg","خضار مشكل مجمد 400جم","Mixed Frozen Veg 400g",38,None,[],["frozen","vegetable"]),
            ("chicken-nuggets","ناجتس دجاج 400جم","Chicken Nuggets 400g",75,89,[],["frozen","kids"]),
            ("chicken-burger","برجر دجاج ×4","Chicken Burger x4",  62, None, [], ["frozen"]),
            ("beef-burger","برجر لحم ×4",     "Beef Burger x4",    98, None, [], ["frozen"]),
            ("fish-fillet","فيليه سمك مجمد",  "Frozen Fish Fillet 500g",125,140,[],["frozen","seafood"]),
            ("shrimp-frozen","جمبري مجمد 500جم","Frozen Shrimp 500g",195,225,["premium"], ["frozen","seafood"]),
            ("samosa-frozen","سمبوسك مجمد ×20","Frozen Samosa x20",78,None, ["traditional"], ["frozen","snack"]),
            ("popsicle-fruit","آيس كريم عيدان فاكهة","Fruit Popsicles x6",45,None,["kids"],["frozen","dessert"]),
        ],
    },
    "organic": {
        "image_query": ["organic-vegetable","organic-fruit","organic-milk","organic-egg","organic-bread","organic-honey","organic-tea","organic-quinoa","organic-oats","organic-flour","organic-coffee","organic-rice","organic-yogurt","organic-tomato","organic-spinach","organic-banana"],
        "items": [
            ("organic-tomato","طماطم عضوي",   "Organic Tomato",    35, None, ["organic","certified"], ["vegetable","clean"]),
            ("organic-spinach","سبانخ عضوي",  "Organic Spinach",   28, None, ["organic"], ["vegetable","leafy"]),
            ("organic-banana","موز عضوي",     "Organic Banana",    45, None, ["organic"], ["fruit"]),
            ("organic-apple","تفاح عضوي",     "Organic Apple",     78, 88,   ["organic","premium"], ["fruit"]),
            ("organic-milk","حليب عضوي 1ل",   "Organic Milk 1L",   65, None, ["organic"], ["dairy"]),
            ("organic-egg-12","بيض عضوي ×12", "Organic Eggs x12",  85, 95,   ["organic","free-range"], ["protein"]),
            ("organic-honey","عسل عضوي 500جم","Organic Honey 500g",325,365, ["organic","premium"], ["sweetener"]),
            ("organic-oats","شوفان عضوي 500جم","Organic Oats 500g",58,None, ["organic","healthy"], ["grain","breakfast"]),
            ("organic-quinoa","كينوا عضوي 500جم","Organic Quinoa 500g",125,None,["organic","superfood"],["grain"]),
            ("organic-rice","أرز بني عضوي 1كجم","Organic Brown Rice 1kg",95,None,["organic","whole"],["grain"]),
            ("organic-flour","دقيق قمح كامل عضوي","Organic Whole Wheat Flour",58,None,["organic"],["baking"]),
            ("organic-bread","خبز عضوي",       "Organic Bread",     38, None, ["organic","artisan"], ["bread"]),
            ("organic-yogurt","زبادي عضوي",   "Organic Yogurt 200g",22,None,["organic"], ["dairy"]),
            ("organic-tea-green","شاي أخضر عضوي","Organic Green Tea",78,None,["organic","antioxidant"],["beverage"]),
            ("organic-coffee","قهوة عضوية 250جم","Organic Coffee 250g",165,None,["organic","fair-trade"],["beverage"]),
            ("organic-olive-oil","زيت زيتون عضوي 500مل","Organic Olive Oil 500ml",225,260,["organic","cold-pressed"],["oil"]),
        ],
    },
    "sweets": {
        "image_query": ["baklava","kunafa","basbousa","mahalabia","cake","chocolate-cake","tiramisu","cheesecake","brownie","donut","cupcake","macaron","eclair","tart","pudding","truffle"],
        "items": [
            ("baklava","بقلاوة بالفستق",      "Pistachio Baklava 500g",195,225,["traditional","premium"], ["dessert","arabic"]),
            ("kunafa-cheese","كنافة بالجبنة","Cheese Kunafa",     145,165,["traditional"], ["dessert","arabic"]),
            ("basbousa","بسبوسة بالقشطة",     "Basbousa with Cream",85,None,["traditional"], ["dessert","arabic"]),
            ("mahalabia","مهلبية فستق",       "Pistachio Mahalabia",45,None,["traditional"], ["dessert","arabic"]),
            ("om-ali","أم علي",                "Om Ali",            65, None, ["traditional","family"], ["dessert"]),
            ("rice-pudding","أرز باللبن",     "Rice Pudding",      35, None, ["traditional"], ["dessert"]),
            ("choc-cake","تورتة شوكولا",      "Chocolate Cake",    225,260, ["birthday"], ["cake"]),
            ("tiramisu","تيراميسو",           "Tiramisu",          85, None, ["italian"], ["dessert"]),
            ("cheesecake","تشيز كيك",         "Cheesecake Slice",  68, None, [], ["dessert"]),
            ("brownie","براوني",               "Brownie",           28, None, [], ["dessert","chocolate"]),
            ("donut-glazed","دونات سكر",      "Glazed Donut",      18, None, [], ["pastry"]),
            ("cupcake-vanilla","كب كيك فانيليا","Vanilla Cupcake", 22, None, [], ["cake"]),
            ("macaron-pack","ماكرون ×6",      "Macaron Box x6",    125,None, ["french","premium"], ["dessert"]),
            ("eclair-choco","إكلير شوكولا",   "Chocolate Éclair",  32, None, [], ["pastry"]),
            ("tart-fruit","تارت فواكه",       "Fruit Tart",        58, None, [], ["dessert"]),
            ("truffle-box","ترافل شوكولا ×9","Chocolate Truffle Box x9",185,210,["premium"],["dessert","chocolate"]),
        ],
    },
    "meat": {
        "image_query": ["beef","chicken","lamb","steak","ground-beef","chicken-breast","drumstick","beef-cubes","whole-chicken","mince","ribs","fillet","kofta","sausage","liver","kebab"],
        "items": [
            ("beef-cubes","لحم بقري مكعبات 1كجم","Beef Cubes 1kg", 295,335, ["fresh"], ["meat","beef"]),
            ("beef-mince","لحم مفروم 1كجم",   "Ground Beef 1kg",   285,325, ["fresh"], ["meat"]),
            ("beef-steak","بفتيك لحم 500جم",  "Beef Steak 500g",   225,None, ["premium"], ["meat","beef"]),
            ("beef-ribs","ضلوع لحم 1كجم",     "Beef Ribs 1kg",     325,None, ["bbq"], ["meat","beef"]),
            ("chicken-whole","فرخة كاملة",    "Whole Chicken ~1.2kg",165,None,["fresh","local"], ["poultry"]),
            ("chicken-breast","صدور دجاج 1كجم","Chicken Breast 1kg",185,210,["healthy"], ["poultry"]),
            ("chicken-drum","أوراك دجاج 1كجم","Chicken Drumstick 1kg",125,None,[], ["poultry"]),
            ("chicken-wing","جوانح دجاج 1كجم","Chicken Wings 1kg", 95, None, ["bbq"], ["poultry"]),
            ("chicken-fillet","فيليه دجاج 500جم","Chicken Fillet 500g",115,None,["healthy"], ["poultry"]),
            ("lamb-cubes","لحم ضأن مكعبات",   "Lamb Cubes 1kg",    485,540, ["premium"], ["meat","lamb"]),
            ("lamb-chops","ريش ضأن",          "Lamb Chops 500g",   325,None, ["premium"], ["meat","lamb"]),
            ("kofta-mix","كفتة مشكلة 500جم",  "Mixed Kofta 500g",  165,None, ["traditional"], ["meat"]),
            ("sausage-beef","سجق بقري 500جم", "Beef Sausage 500g", 145,None, [], ["meat"]),
            ("liver-beef","كبد بقري 500جم",   "Beef Liver 500g",   95, None, [], ["offal"]),
            ("kebab-marinated","كباب متبل 500جم","Marinated Kebab 500g",195,None,["bbq"], ["meat"]),
            ("turkey-breast","صدر ديك رومي 1كجم","Turkey Breast 1kg",215,None,["healthy"], ["poultry"]),
        ],
    },
    "wholesale": {
        "image_query": ["bulk-rice","bulk-flour","bulk-oil","bulk-sugar","bulk-pasta","bulk-tea","bulk-coffee","bulk-detergent","bulk-water","bulk-juice","bulk-chips","bulk-tomato","bulk-potato","bulk-chicken","bulk-cheese","bulk-eggs"],
        "items": [
            ("bulk-rice-25","أرز جملة 25كجم", "Bulk Rice 25kg",    750,850, ["b2b","wholesale"], ["bulk","grain"]),
            ("bulk-flour-50","دقيق جملة 50كجم","Bulk Flour 50kg",  825,925, ["b2b"], ["bulk","baking"]),
            ("bulk-oil-20","زيت جملة 20ل",    "Bulk Oil 20L",      1150,1295,["b2b"], ["bulk","cooking"]),
            ("bulk-sugar-50","سكر جملة 50كجم","Bulk Sugar 50kg",   1480,None,["b2b"], ["bulk"]),
            ("bulk-pasta-10","مكرونة كرتونة ×24","Pasta Carton x24",380,425,["b2b"], ["bulk","pasta"]),
            ("bulk-tea-1kg","شاي جملة 1كجم",  "Bulk Tea 1kg",      425,None, ["b2b"], ["bulk","beverage"]),
            ("bulk-coffee-1kg","قهوة جملة 1كجم","Bulk Coffee 1kg", 685,None, ["b2b"], ["bulk","beverage"]),
            ("bulk-detergent-25","مسحوق غسيل 25كجم","Bulk Detergent 25kg",1295,None,["b2b"],["bulk","laundry"]),
            ("bulk-water-pack","مياه كرتونة ×24","Water Carton x24",165,185,["b2b"], ["bulk","water"]),
            ("bulk-juice-12","عصائر كرتونة ×12","Juice Carton x12",385,None,["b2b"], ["bulk","beverage"]),
            ("bulk-chips-30","شيبسي كرتونة ×30","Chips Carton x30",295,None,["b2b"], ["bulk","snack"]),
            ("bulk-tomato-10","طماطم 10كجم",  "Bulk Tomato 10kg",  155,180, ["b2b"], ["bulk","produce"]),
            ("bulk-potato-15","بطاطس 15كجم",  "Bulk Potato 15kg",  165,None, ["b2b"], ["bulk","produce"]),
            ("bulk-chicken-10","دجاج طازج 10كجم","Bulk Chicken 10kg",1450,None,["b2b","cold"],["bulk","poultry"]),
            ("bulk-cheese-5","جبنة بيضاء 5كجم","Bulk White Cheese 5kg",695,None,["b2b"], ["bulk","cheese"]),
            ("bulk-eggs-360","بيض ×360",      "Bulk Eggs x360 (12 trays)",1185,None,["b2b"], ["bulk","protein"]),
        ],
    },
}

# Capability-driven extras: determined per section, not per product
SECTION_EXTRAS = {
    "produce":   {"variants": False, "addons": False, "nutrition": True},
    "home-goods":{"variants": True,  "addons": False, "nutrition": False},
    "dairy":     {"variants": False, "addons": False, "nutrition": True},
    "bakery":    {"variants": True,  "addons": False, "nutrition": True},
    "beverages": {"variants": True,  "addons": False, "nutrition": True},
    "snacks":    {"variants": False, "addons": False, "nutrition": True},
    "household": {"variants": True,  "addons": False, "nutrition": False},
    "frozen":    {"variants": False, "addons": False, "nutrition": True},
    "organic":   {"variants": False, "addons": False, "nutrition": True},
    "sweets":    {"variants": True,  "addons": True,  "nutrition": True},
    "meat":      {"variants": True,  "addons": False, "nutrition": True},
    "wholesale": {"variants": True,  "addons": False, "nutrition": False},
}

VARIANT_AXES = {
    "home-goods": ("size",  [("small","صغير",-2,True),("medium","وسط",0,True),("large","كبير",4,False)]),
    "bakery":     ("size",  [("regular","عادي",0,True),("large","كبير",6,False)]),
    "beverages":  ("size",  [("330ml","330مل",-3,False),("500ml","500مل",0,True),("1l","1ل",4,False)]),
    "household":  ("size",  [("regular","عادي",0,True),("family","عائلي",12,False)]),
    "sweets":     ("portion",[("single","قطعة",-15,False),("box","علبة",0,True),("family","عائلي",35,False)]),
    "meat":       ("cut",   [("cubes","مكعبات",0,True),("strips","شرائح",4,False),("ground","مفروم",-2,False)]),
    "wholesale":  ("pack",  [("standard","قياسي",0,True),("xl","عملاق",80,False)]),
}

NUTRITION_TEMPLATES = {
    "produce":   {"per100g": {"kcal":35,"carbs_g":7,"protein_g":1,"fat_g":0,"fiber_g":2}, "diet": {"halal":True,"vegan":True,"gluten_free":True}, "allergens":[]},
    "dairy":     {"per100g": {"kcal":120,"carbs_g":8,"protein_g":7,"fat_g":6}, "diet": {"halal":True,"vegetarian":True}, "allergens":["milk"]},
    "bakery":    {"per100g": {"kcal":280,"carbs_g":52,"protein_g":8,"fat_g":4}, "diet": {"halal":True,"vegetarian":True}, "allergens":["wheat","gluten"]},
    "beverages": {"per100g": {"kcal":42,"carbs_g":10,"protein_g":0,"fat_g":0}, "diet": {"halal":True,"vegan":True,"gluten_free":True}, "allergens":[]},
    "snacks":    {"per100g": {"kcal":480,"carbs_g":52,"protein_g":7,"fat_g":24}, "diet": {"halal":True}, "allergens":["wheat"]},
    "frozen":    {"per100g": {"kcal":220,"carbs_g":25,"protein_g":10,"fat_g":9}, "diet": {"halal":True}, "allergens":["wheat","milk"]},
    "organic":   {"per100g": {"kcal":85,"carbs_g":15,"protein_g":3,"fat_g":1,"fiber_g":4}, "diet": {"halal":True,"vegan":True,"organic":True}, "allergens":[]},
    "sweets":    {"per100g": {"kcal":420,"carbs_g":58,"protein_g":5,"fat_g":18,"sugar_g":42}, "diet": {"halal":True,"vegetarian":True}, "allergens":["milk","wheat","nuts"]},
    "meat":      {"per100g": {"kcal":195,"carbs_g":0,"protein_g":24,"fat_g":11}, "diet": {"halal":True,"high_protein":True,"keto":True}, "allergens":[]},
}

ADDON_GROUPS = {
    "sweets": [
        ("topping", "إضافات", [("nuts","مكسرات إضافية",12),("syrup","قطر إضافي",4),("cream","كريمة",8)]),
        ("packaging","تغليف", [("gift","علبة هدية",15),("ribbon","شريطة",3)]),
    ],
}

def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"

def jb(obj) -> str:
    return sql_str(json.dumps(obj, ensure_ascii=False)) + "::jsonb"

def img_url(seed: str, w: int = 800, h: int = 800) -> str:
    return f"https://picsum.photos/seed/{seed}/{w}/{h}"

# ─── Generate SQL ────────────────────────────────────────────────────────
buf: list[str] = []
buf.append("-- =============================================================")
buf.append("-- Salsabil Runtime Catalog Seed (Wave 2.D)")
buf.append("-- Idempotent: re-running upserts products and refreshes media.")
buf.append("-- =============================================================")
buf.append("BEGIN;")
buf.append("")

product_count = 0
media_count = 0
variant_count = 0
addon_count = 0
nutrition_count = 0
relation_count = 0

# Map section_slug → ordered product slugs (for relation graph)
section_to_slugs: dict[str, list[str]] = {}

for section_slug, payload in CATALOG.items():
    items = payload["items"]
    images = payload["image_query"]
    section_to_slugs[section_slug] = []
    extras = SECTION_EXTRAS[section_slug]

    buf.append(f"-- ─── {section_slug} ({len(items)} products) ───")
    buf.append(f"DO $$ DECLARE sec_id uuid; BEGIN")
    buf.append(f"  SELECT id INTO sec_id FROM sections WHERE slug = {sql_str(section_slug)};")
    buf.append(f"  IF sec_id IS NULL THEN RAISE EXCEPTION 'section % not found', {sql_str(section_slug)}; END IF;")

    for idx, (frag, name_ar, name_en, base, compare, badges, tags) in enumerate(items):
        slug = f"{section_slug}-{frag}"
        section_to_slugs[section_slug].append(slug)
        sku = f"USA-{section_slug.upper()[:3]}-{idx+1:03d}"
        img_q = images[idx % len(images)]
        hero_seed = f"{section_slug}-{frag}-hero"
        gallery_seeds = [f"{section_slug}-{frag}-g{i}" for i in range(1, 4)]

        name_obj = {"ar": name_ar, "en": name_en}
        short_obj = {"ar": f"{name_ar} طازج بأعلى جودة", "en": f"Fresh {name_en} top quality"}
        desc_obj = {"ar": f"{name_ar} من إنتاج محلي مختار بعناية. مثالي للاستخدام اليومي ويتميز بنكهة أصيلة وجودة موثوقة.", "en": f"Carefully sourced {name_en}. Perfect for daily use with authentic flavor and trusted quality."}

        popularity = round(random.Random(slug).uniform(20, 95), 2)
        stock = random.Random(slug + "stock").randint(50, 500)
        is_featured = (idx % 5 == 0)
        compare_val = "NULL" if compare is None else str(compare)

        buf.append(f"  -- {slug}")
        buf.append(
            "  INSERT INTO usa_products "
            "(slug, sku, section_id, name_i18n, short_description_i18n, description_i18n, "
            "base_price, compare_at_price, currency, sale_unit, stock_qty, low_stock_threshold, "
            "is_perishable, badges, tags, attributes, popularity_score, rating_avg, rating_count, "
            "is_active, is_featured) VALUES ("
            f"{sql_str(slug)}, {sql_str(sku)}, sec_id, "
            f"{jb(name_obj)}, {jb(short_obj)}, {jb(desc_obj)}, "
            f"{base}, {compare_val}, 'EGP', 'piece', {stock}, 10, "
            f"{'true' if section_slug in ('produce','dairy','bakery','meat','frozen') else 'false'}, "
            f"ARRAY[{','.join(sql_str(b) for b in badges) or ''}]::text[], "
            f"ARRAY[{','.join(sql_str(t) for t in tags) or ''}]::text[], "
            f"{jb({'origin':'EG','image_query':img_q})}, "
            f"{popularity}, {round(3.5 + random.Random(slug+'r').uniform(0, 1.4), 2)}, "
            f"{random.Random(slug+'rc').randint(8, 230)}, true, {'true' if is_featured else 'false'}) "
            "ON CONFLICT (slug) DO UPDATE SET "
            "name_i18n=EXCLUDED.name_i18n, short_description_i18n=EXCLUDED.short_description_i18n, "
            "description_i18n=EXCLUDED.description_i18n, base_price=EXCLUDED.base_price, "
            "compare_at_price=EXCLUDED.compare_at_price, badges=EXCLUDED.badges, tags=EXCLUDED.tags, "
            "attributes=EXCLUDED.attributes, popularity_score=EXCLUDED.popularity_score, "
            "stock_qty=EXCLUDED.stock_qty, is_featured=EXCLUDED.is_featured, "
            "updated_at=now();"
        )
        product_count += 1

        # Media: clear + insert hero + 3 gallery
        buf.append(f"  DELETE FROM product_media WHERE product_id = (SELECT id FROM usa_products WHERE slug = {sql_str(slug)});")
        buf.append(
            "  INSERT INTO product_media (product_id, url, kind, alt_i18n, width, height, sort_order) "
            f"SELECT id, {sql_str(img_url(hero_seed))}, 'hero', "
            f"{jb({'ar': name_ar, 'en': name_en})}, 800, 800, 0 "
            f"FROM usa_products WHERE slug = {sql_str(slug)};"
        )
        media_count += 1
        for g_idx, gs in enumerate(gallery_seeds):
            buf.append(
                "  INSERT INTO product_media (product_id, url, kind, alt_i18n, width, height, sort_order) "
                f"SELECT id, {sql_str(img_url(gs))}, 'gallery', "
                f"{jb({'ar': name_ar, 'en': name_en})}, 800, 800, {g_idx + 1} "
                f"FROM usa_products WHERE slug = {sql_str(slug)};"
            )
            media_count += 1

        # Variants
        if extras["variants"] and section_slug in VARIANT_AXES:
            axis_key, opts = VARIANT_AXES[section_slug]
            buf.append(f"  DELETE FROM product_variants_v2 WHERE product_id = (SELECT id FROM usa_products WHERE slug = {sql_str(slug)});")
            for v_idx, (val, label_ar, delta, is_def) in enumerate(opts):
                buf.append(
                    "  INSERT INTO product_variants_v2 (product_id, axis_key, axis_value, axis_value_i18n, "
                    "price_delta, stock, is_default, is_active, sort_order) "
                    f"SELECT id, {sql_str(axis_key)}, {sql_str(val)}, "
                    f"{jb({'ar': label_ar, 'en': val})}, {delta}, "
                    f"{random.Random(slug+val).randint(20,200)}, {'true' if is_def else 'false'}, true, {v_idx} "
                    f"FROM usa_products WHERE slug = {sql_str(slug)};"
                )
                variant_count += 1

        # Addons
        if extras["addons"] and section_slug in ADDON_GROUPS:
            buf.append(f"  DELETE FROM product_addons WHERE product_id = (SELECT id FROM usa_products WHERE slug = {sql_str(slug)});")
            for grp_key, grp_name, options in ADDON_GROUPS[section_slug]:
                for a_idx, (akey, alabel, delta) in enumerate(options):
                    buf.append(
                        "  INSERT INTO product_addons (product_id, group_key, group_name_i18n, name_i18n, "
                        "kind, price_delta, is_required, max_qty, sort_order, is_active) "
                        f"SELECT id, {sql_str(grp_key)}, {jb({'ar': grp_name})}, {jb({'ar': alabel})}, "
                        f"'custom', {delta}, false, 5, {a_idx}, true "
                        f"FROM usa_products WHERE slug = {sql_str(slug)};"
                    )
                    addon_count += 1

        # Nutrition
        if extras["nutrition"] and section_slug in NUTRITION_TEMPLATES:
            t = NUTRITION_TEMPLATES[section_slug]
            buf.append(
                "  INSERT INTO product_nutrition (product_id, per_100g, allergens, diet_flags) "
                f"SELECT id, {jb(t['per100g'])}, "
                f"ARRAY[{','.join(sql_str(a) for a in t['allergens']) or ''}]::text[], "
                f"{jb(t['diet'])} "
                f"FROM usa_products WHERE slug = {sql_str(slug)} "
                "ON CONFLICT (product_id) DO UPDATE SET per_100g=EXCLUDED.per_100g, "
                "allergens=EXCLUDED.allergens, diet_flags=EXCLUDED.diet_flags;"
            )
            nutrition_count += 1

    buf.append("END $$;")
    buf.append("")

# ─── Relation graph ──────────────────────────────────────────────────────
buf.append("-- ─── Relation graph (related/complementary/substitute) ───")
for section_slug, slugs in section_to_slugs.items():
    if len(slugs) < 4:
        continue
    rng = random.Random(section_slug + "rels")
    buf.append(f"DO $$ DECLARE p_id uuid; r_id uuid; BEGIN")
    pairs: list[tuple[str,str,str,float]] = []
    for i, slug in enumerate(slugs):
        # 3 related + 2 complementary + 1 substitute per product
        others = [s for s in slugs if s != slug]
        rng.shuffle(others)
        for r in others[:3]:
            pairs.append((slug, r, "related", round(rng.uniform(0.5, 0.9), 4)))
        for r in others[3:5]:
            pairs.append((slug, r, "complementary", round(rng.uniform(0.4, 0.8), 4)))
        for r in others[5:6]:
            pairs.append((slug, r, "substitute", round(rng.uniform(0.3, 0.7), 4)))
    for src, dst, rtype, strength in pairs:
        buf.append(
            f"  SELECT id INTO p_id FROM usa_products WHERE slug = {sql_str(src)};"
            f" SELECT id INTO r_id FROM usa_products WHERE slug = {sql_str(dst)};"
            f" IF p_id IS NOT NULL AND r_id IS NOT NULL AND p_id <> r_id THEN"
            f"   INSERT INTO product_relations (product_id, related_id, relation_type, strength)"
            f"   VALUES (p_id, r_id, {sql_str(rtype)}, {strength})"
            f"   ON CONFLICT (product_id, related_id, relation_type) DO UPDATE SET strength = EXCLUDED.strength;"
            f" END IF;"
        )
        relation_count += 1
    buf.append("END $$;")
    buf.append("")

buf.append("COMMIT;")
buf.append("")
buf.append(f"-- Summary: products={product_count}, media={media_count}, variants={variant_count}, addons={addon_count}, nutrition={nutrition_count}, relations={relation_count}")

OUT.write_text("\n".join(buf), encoding="utf-8")
print(f"✓ Wrote {OUT} ({OUT.stat().st_size//1024} KB)")
print(f"  products={product_count}, media={media_count}, variants={variant_count}, addons={addon_count}, nutrition={nutrition_count}, relations={relation_count}")
