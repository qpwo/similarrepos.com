const login_holder = document.querySelector("#login_holder")
const logout_button = document.querySelector("#logout_button")
const login_button = document.querySelector("#login_button")

function updateLoginButton() {
    while (login_holder.firstChild) {
        login_holder.firstChild.remove()
    } if (window.localStorage.getItem("token") == null) {
        login_holder.appendChild(login_button)
    } else {
        login_holder.appendChild(logout_button)
    }
}

updateLoginButton()

function logout() {
    localStorage.removeItem("token")
    updateLoginButton()
}
