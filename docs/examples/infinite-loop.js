// Infinite loop script
// Tests timeout functionality (default 5 minutes)
console.log('Starting infinite loop...');
console.log('This should be killed by the timeout mechanism');

let count = 0;
while (true) {
  count++;
  if (count % 100000000 === 0) {
    console.log(`Still running... iteration ${count}`);
  }
}
