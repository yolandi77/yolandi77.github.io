
console.log('hello from worker')
self.addEventListener('message', (event) => {
    console.log('Received message in Service Worker:', event.data);

    self.postMessage(event.data());
});

