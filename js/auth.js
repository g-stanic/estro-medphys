import { CLIENT_ID, REDIRECT_URI} from './config.js';

export function authenticateWithGitHub() {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read:user`;
    window.open(authUrl, 'GitHub Authentication', 'width=600,height=600');
}

export function handleAuthCode(code) {
    if (code) {
        // User has been authenticated
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.style.display = 'none'; // Hide the login button
        }
        // You might want to store the authentication state or token here
        console.log('User authenticated successfully');
        console.log('Authentication code:', code);
        // Here you would typically send this code to your backend to exchange for an access token
    } else {
        console.log('No authentication code received');
    }
}
