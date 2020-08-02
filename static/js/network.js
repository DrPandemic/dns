const API_PATH = '/api/1'

export function getPassword() {
    return sessionStorage.getItem('password') || document.getElementById('login-password').value;
}

function doCall(name) {
    return fetch(
        `${API_PATH}/${name}`, {
            headers: {
                'authorization': `Bearer ${getPassword()}`,
            }
        }
    ).then(response => {
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
