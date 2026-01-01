import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './styles/main.css'
import { createApp } from 'vue'
import App from './app/App.vue'
import { router } from './app/router'
import { initTheme } from './app/theme'
import { loadDirectory } from './features/tickets/directory'

initTheme()
void loadDirectory()
createApp(App).use(router).mount('#app')
