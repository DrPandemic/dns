import {
    getFilterStatistics,
    getCache,
    getInstrumentation,
    getPassword,
    getAllowedDomains,
    postAllowedDomains,
} from './network.js';

const NSEC_PER_SEC = 1000000000;

document.getElementById('login-button').addEventListener('click', main);
document.getElementById('reload').addEventListener('click', main);
document.getElementById('add-domain-name-button').addEventListener('click', addAllowedDomain);

document.getElementById('login-password').addEventListener('keyup', function(event) {
    if (event.keycode === 13) {
        event.preventDefault();
        addAllowedDomain();
    }
});

document.getElementById('add-domain-name').addEventListener('keyup', function(event) {
    if (event.keycode === 13) {
        event.preventDefault();
        document.getElementById("login-button").click();
    }
});

if(getPassword()) {
    main();
}

function main() {
    showStatistics()
        .then(showMain)
        .then(showCache)
        .then(showInstrumentation)
        .then(showAllowedDomains)
        .catch(e => {
            alert(e);
            document.getElementById('login-container').style.display = 'block';
            document.getElementById('main-container').style.display = 'none';
        });
}

function showMain() {
    document.getElementById('add-domain-name').value = '';
    const password = document.getElementById('login-password').value;
    if(password) {
        sessionStorage.setItem("password", password);
    }
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';
    return Promise.resolve();
}

function showStatistics() {
    return getFilterStatistics().then(statistics => {
        let entries = Object.entries(statistics.data.data);
        entries.sort((a, b) => a[1] - b[1]);
        const table = document.getElementById('statistics');
        table.innerHTML = '';

        for(const entry of entries) {
            const row = table.insertRow(0);
            const cell0 = row.insertCell(0);
            const cell1 = row.insertCell(1);
            cell0.innerHTML = entry[0];
            cell1.innerHTML = entry[1];
        }

        return Promise.resolve();
    });
}

function showCache() {
    return getCache().then(cache => {
        const table = document.getElementById('cache');
        table.innerHTML = ""

        cache.data.data.sort((a, b) => a.valid_until - b.valid_until);

        for(const entry of cache.data.data) {
            const row = table.insertRow(0);
            const cell0 = row.insertCell(0);
            const cell1 = row.insertCell(1);
            cell0.innerHTML = entry.message.name;
            const date = new Date(0);
            date.setUTCSeconds(entry.valid_until);
            cell1.innerHTML = date.toLocaleString();
        }

        const count = document.getElementById('cache-count');
        count.textContent = cache.data.data.length;

        return Promise.resolve();
    });
}

function showInstrumentation() {
    return getInstrumentation().then(instrumentation => {
        const table = document.getElementById('instrumentation');
        table.innerHTML = ""

        let resolvers = instrumentation.data.container.reduce((acc, entry) => {
            if(entry.resolver === null) {
                return acc;
            }
            if(!(entry.resolver in acc)) {
                acc[entry.resolver] = [];
            }
            const diffSecs = entry.request_received.secs_since_epoch - entry.request_sent.secs_since_epoch;
            const diff = (diffSecs * NSEC_PER_SEC) + entry.request_received.nanos_since_epoch - entry.request_sent.nanos_since_epoch;
            acc[entry.resolver].push(diff);
            return acc;
        }, {});

        let entries = Object.entries(resolvers);
        entries = entries.map((entry) => {
            const sum = entry[1].reduce((acc, item) => acc + item, 0)
            return { resolver: entry[0], average: sum / entry[1].length / (Math.pow(10, 6)), count: entry[1].length };
        });

        for(const entry of entries) {
            const row = table.insertRow(0);
            const cell0 = row.insertCell(0);
            const cell1 = row.insertCell(1);
            const cell2 = row.insertCell(2);
            cell0.innerHTML = entry.resolver;
            cell1.innerHTML = entry.average;
            cell2.innerHTML = entry.count;
        }

        return Promise.resolve();
    });
}

function showAllowedDomains() {
    return getAllowedDomains().then(domains => {
        const table = document.getElementById('allowed-domains');
        table.innerHTML = ""
        for(const domain of domains) {
            const row = table.insertRow(0);
            const cell0 = row.insertCell(0);
            cell0.innerHTML = domain;
        }

        return Promise.resolve();
    });
}

function addAllowedDomain() {
    const input = document.getElementById('add-domain-name').value;
    postAllowedDomains(input).then(main);
}
