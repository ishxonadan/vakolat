import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import { definePreset } from '@primeuix/styled';
import Aura from '@primevue/themes/aura';
import PrimeVue from 'primevue/config';

/** Dark mode: brighter than stock Aura zinc, slight cool slate tint (not flat gray/black). */
const AuraSoftDark = definePreset(Aura, {
    primitive: {
        zinc: {
            950: '#1b2030',
            900: '#242a38',
            800: '#303849',
            700: '#3d4558',
            600: '#4b5368'
        }
    }
});
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

import '@/assets/styles.scss';
import '@/assets/tailwind.css';
import '@/service/pagination.service.js';

const app = createApp(App);

app.use(router);
app.use(PrimeVue, {
    theme: {
        preset: AuraSoftDark,
        options: {
            darkModeSelector: '.app-dark'
        }
    }
});
app.use(ToastService);
app.use(ConfirmationService);

app.mount('#app');
