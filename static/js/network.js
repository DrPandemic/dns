const API_PATH = '/api/1'

export function getPassword() {
    return sessionStorage.getItem('password') || document.getElementById('login-password').value;
}

function doCall(name, verb = 'GET', payload = null) {
    let options = {
        method: verb,
        headers: {
            authorization: `Bearer ${getPassword()}`,
            'Content-Type': 'application/json'
        },
    };
    if (payload !== null) {
        options['body'] = JSON.stringify(payload);
    }

    return fetch(`${API_PATH}/${name}`, options)
        .then(response => {
        if(response.status === 200) {
            return response.json();
        } else if(response.status === 401) {
            sessionStorage.removeItem('password')
        }
        return Promise.reject(new Error(response.statusText));
    });
}

export function getFilterStatistics() {
    return doCall('filter-statistics');
}

export function getCache() {
    return doCall('cache');
}

export function getInstrumentation() {
    return doCall('instrumentation');
}

export function getAllowedDomains() {
    return doCall('allowed-domains');
}

export function postAllowedDomains(domain) {
    return doCall('allowed-domains', 'POST', { name: domain });
}

export function deleteAllowedDomains(domain) {
    return doCall('allowed-domains', 'DELETE', { name: domain });
}
