import http.client
import json
import time
import subprocess
import sys

print('=== Sending POST to /chatbot/query ===')
conn = http.client.HTTPConnection('127.0.0.1', 8000, timeout=120)
payload = json.dumps({
    'userId': 'dev-uid-000',
    'query': "Quel est l'état de trésorerie ?",
    'analysisData': {}
})
headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer faketoken'}
conn.request('POST', '/chatbot/query', body=payload, headers=headers)
res = conn.getresponse()
print(f'Status: {res.status}')
response_body = res.read().decode()
print(f'Response: {response_body}')

# Pause pour laisser les logs s'afficher
time.sleep(1)
print('\n=== Test completed ===')
