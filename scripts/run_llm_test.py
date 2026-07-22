import http.client
import json
import time

# Attendez le démarrage du serveur
time.sleep(2)

print('=== CHATBOT avec Analysis Data ===')
conn = http.client.HTTPConnection('127.0.0.1', 8000, timeout=120)

# Données d'analyse avec ratios pour déclencher l'appel LLM
payload = json.dumps({
    'userId': 'dev-uid-000',
    'query': "Quel est l'état de trésorerie ?",
    'analysisData': {
        'score': 65,
        'zone': 'vigilance',
        'ratios': {
            'current_ratio': 1.2,
            'debt_equity': 1.5,
            'roe': 0.08,
            'dsr': 45,
            'dpo': 35
        },
        'recommendations': [
            {'action': 'Augmenter le CA', 'level': 'high'}
        ]
    }
})

headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer faketoken'
}

print(f'Sending POST to /chatbot/query with analysis data...')
conn.request('POST', '/chatbot/query', body=payload, headers=headers)
res = conn.getresponse()
print(f'Status: {res.status}')
response_body = res.read().decode()
print(f'Response:\n{response_body}')

print('\n=== Test completed ===')
