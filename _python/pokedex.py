import requests
import json

def get_pokemon_info(dex_number):
    url = f'https://pokeapi.co/api/v2/pokemon-species/{dex_number}/'
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
                
        # 日本語のポケモン名
        name_ja = next(
            (name['name'] for name in data['names'] if name['language']['name'] == 'ja'),
            None
        )
        
        # 日本語の分類
        genus = next(
            (item['genus'] for item in data['genera'] if item['language']['name'] == 'ja'),
            None
        )
        
        # フレーバーテキスト（日本語 漢字）
        flavor_texts_ja = [
            flavor['flavor_text'] for flavor in data['flavor_text_entries'] 
            if flavor['language']['name'] == 'ja'
        ]
        
        # フレーバーテキスト（日本語 ひらがな・カタカナ）
        flavor_texts_jahrkt = [
            flavor['flavor_text'] for flavor in data['flavor_text_entries'] 
            if flavor['language']['name'] == 'ja-Hrkt'
        ]
        
        return {
            'dex_number': dex_number,
            'name': name_ja,
            'genus': genus,
            'flavor_texts_ja': flavor_texts_ja,
            'flavor_texts_jahrkt': flavor_texts_jahrkt
        }
    else:
        return None

# ピカチュウ (25番) と 778番のポケモン情報を取得
pikachu = get_pokemon_info(25)
mimikyu = get_pokemon_info(778)

# JSONファイルに保存
pokedex = [
    pikachu,
    mimikyu,
]

with open('./PAGES/pikachu_mimikyu/_python/pokedex.json', 'w', encoding='utf-8') as f:
    json.dump(pokedex, f, ensure_ascii=False, indent=4)

