import assert from 'node:assert/strict';
import { validateActionAttachments } from '../utils/complaintActionAttachments.js';

const tinyPdf =
    'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE3NwolJUVPRg==';

const ok = validateActionAttachments([
    {
        url: tinyPdf,
        filename: 'report.pdf',
        fileType: 'application/pdf'
    }
]);
assert.equal(ok.ok, true);
assert.equal(ok.files.length, 1);

const badMime = validateActionAttachments([
    {
        url: tinyPdf,
        filename: 'evil.exe',
        fileType: 'application/x-msdownload'
    }
]);
assert.equal(badMime.ok, false);

const empty = validateActionAttachments([]);
assert.equal(empty.ok, true);
assert.equal(empty.files.length, 0);

console.log('testActionAttachments: ok');