import http.client
import json

print('=== HEALTH ===')
conn = http.client.HTTPConnection('127.0.0.1', 8000, timeout=30)
conn.request('GET', '/')
res = conn.getresponse()
print(res.status, res.reason)
print(res.read().decode())

print('\n=== DEBUG LLMs ===')
conn = http.client.HTTPConnection('127.0.0.1', 8000, timeout=30)
conn.request('GET', '/debug/llms')
res = conn.getresponse()
print(res.status, res.reason)
print(res.read().decode())

print('\n=== CHATBOT QUERY ===')
conn = http.client.HTTPConnection('127.0.0.1', 8000, timeout=120)
payload = json.dumps({
    'userId': 'dev-uid-000',
    'query': "Quel est l'état de trésorerie ?",
    'analysisData': {}
})
headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer faketoken'}
conn.request('POST', '/chatbot/query', body=payload, headers=headers)
res = conn.getresponse()
print(res.status, res.reason)
print(res.read().decode())
