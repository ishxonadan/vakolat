<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import authService from '@/service/auth.service';

const toast = useToast();
const router = useRouter();

const angle = ref(33);
const speed = 0;

const animatedStyle = computed(() => ({
  background: `linear-gradient(${angle.value}deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 75%)`,
}));

let animationFrameId;

const animate = () => {
  angle.value = (angle.value + speed) % 360;
  animationFrameId = requestAnimationFrame(animate);
};

onMounted(() => {
  animate();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
});

const email = ref('');
const password = ref('');
const checked = ref(false);



const login = async () => {
  try {
    const result = await authService.login(email.value, password.value);

    if (result.success) {
      // Show success toast
      toast.add({ severity: 'success', summary: 'Muvaffaqiyat', detail: 'Login successful', life: 3000 });

      // Redirect to main page
      router.push('/');
    } else {
      // Show error toast
      toast.add({ severity: 'error', summary: 'Xato', detail: result.error || 'Login failed', life: 3000 });
    }
  } catch (error) {
    console.error('Login error:', error);
    toast.add({ severity: 'error', summary: 'Xato', detail: 'Xatolik yuz berdi', life: 3000 });
  }
};
</script>

<template>
  <FloatingConfigurator />
  <div class="login-background">
    <!-- Enhanced floating elements -->
    <div class="floating-shapes">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
      <div class="shape shape-4"></div>
      <div class="shape shape-5"></div>
    </div>

    <!-- Glass orbs for extra effect -->
    <div class="glass-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>



    <div class="login-container">
      <!-- Main login card with enhanced styling -->
      <div class="login-card" :style="animatedStyle">
        <div class="login-content">
          <!-- Header with logo/title -->
          <div class="login-header">
            <div class="logo-container">
              <img src="/logo.svg" alt="Vakolat" class="real-logo" />
            </div>

            <p class="login-subtitle">Tizimga kirish uchun ma'lumotlaringizni kiriting</p>
          </div>

          <!-- Login form -->
          <form @submit.prevent="login" class="login-form">
            <div class="form-group">
              <label for="email1" class="form-label">Login</label>
              <InputText
                id="email1"
                type="text"
                placeholder="Login kiriting"
                class="form-input"
                v-model="email"
                required
              />
            </div>

            <div class="form-group">
              <label for="password1" class="form-label">Kalit so'z</label>
              <Password
                id="password1"
                v-model="password"
                placeholder="Kalit so'z kiriting"
                :toggleMask="true"
                class="password-input"
                fluid
                :feedback="false"
                required
              ></Password>
            </div>

            <div class="form-options">
              <div class="remember-me">
                <Checkbox v-model="checked" id="rememberme1" binary class="custom-checkbox"></Checkbox>
                <label for="rememberme1" class="checkbox-label">Eslab qol</label>
              </div>
              <a href="#" class="forgot-password">Parol esdan chiqdimi?</a>
            </div>

            <Button type="submit" label="Kirish" class="login-button">
              <template #icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H15M10 17L15 12M15 12L10 7M15 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </template>
            </Button>
          </form>

          <!-- Footer -->
          <div class="login-footer">
            <div class="divider">
              <span>O'zbekiston Milliy kutubxonasi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Toast />
</template>

<style scoped>
/* Import custom font for this page only */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

/* Login page styles */
.login-background {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #e0f2fe 0%, #a5f3fc 25%, #d1fae5 50%, #bfdbfe 75%, #e0f2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

.login-background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 25% 25%, rgba(224, 242, 254, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(165, 243, 252, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 50% 10%, rgba(209, 250, 229, 0.15) 0%, transparent 60%);
  animation: backgroundPulse 12s ease-in-out infinite;
}

@keyframes backgroundPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Floating shapes animation */
.floating-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(10px);
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 100px;
  height: 100px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.shape-3 {
  width: 80px;
  height: 80px;
  top: 40%;
  left: 80%;
  animation-delay: 4s;
}

.shape-4 {
  width: 60px;
  height: 60px;
  top: 15%;
  right: 25%;
  animation-delay: 1s;
}

.shape-5 {
  width: 120px;
  height: 120px;
  top: 75%;
  left: 25%;
  animation-delay: 3s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
    opacity: 0.8;
  }
}



/* Glass orbs effect */
.glass-orbs {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
  backdrop-filter: blur(2px);
  animation: orbFloat 8s ease-in-out infinite;
}

.orb-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 5%;
  animation-delay: 0s;
}

.orb-2 {
  width: 150px;
  height: 150px;
  top: 70%;
  right: 10%;
  animation-delay: 4s;
}

.orb-3 {
  width: 100px;
  height: 100px;
  top: 50%;
  left: 90%;
  animation-delay: 2s;
}

@keyframes orbFloat {
  0%, 100% {
    transform: translateY(0px) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-30px) scale(1.1);
    opacity: 0.6;
  }
}

/* Bubble effect */
.bubble-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.bubble {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.6), rgba(147, 197, 253, 0.3) 50%, rgba(191, 219, 254, 0.15) 80%, transparent 100%);
  backdrop-filter: blur(2px);
  border: 2px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
  animation: bubblePulse 4s ease-in-out infinite;
}

.bubble-1 {
  width: 80px;
  height: 80px;
  top: 15%;
  left: 8%;
  animation-delay: 0s;
}

.bubble-2 {
  width: 60px;
  height: 60px;
  top: 25%;
  right: 12%;
  animation-delay: 0.8s;
}

.bubble-3 {
  width: 100px;
  height: 100px;
  top: 45%;
  left: 5%;
  animation-delay: 1.6s;
}

.bubble-4 {
  width: 70px;
  height: 70px;
  top: 35%;
  right: 8%;
  animation-delay: 2.4s;
}

.bubble-5 {
  width: 90px;
  height: 90px;
  top: 65%;
  left: 15%;
  animation-delay: 3.2s;
}

.bubble-6 {
  width: 50px;
  height: 50px;
  top: 75%;
  right: 15%;
  animation-delay: 4s;
}

.bubble-7 {
  width: 65px;
  height: 65px;
  top: 20%;
  left: 75%;
  animation-delay: 4.8s;
}

.bubble-8 {
  width: 110px;
  height: 110px;
  top: 55%;
  right: 5%;
  animation-delay: 5.6s;
}

.bubble-9 {
  width: 55px;
  height: 55px;
  top: 80%;
  left: 45%;
  animation-delay: 6.4s;
}

.bubble-10 {
  width: 75px;
  height: 75px;
  top: 40%;
  left: 45%;
  animation-delay: 7.2s;
}

@keyframes bubblePulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.9;
  }
}

/* Login container */
.login-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 480px;
  padding: 2rem;
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Login card */
.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  box-shadow:
    0 25px 50px rgba(0, 0, 0, 0.15),
    0 10px 20px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(255, 255, 255, 0.3),
    inset 0 0 20px rgba(255, 255, 255, 0.1);
  padding: 3rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
}

.login-card:hover {
  box-shadow:
    0 25px 50px rgba(0, 0, 0, 0.15),
    0 10px 20px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(255, 255, 255, 0.3),
    inset 0 0 20px rgba(255, 255, 255, 0.1);
}

/* Dark mode support */
.dark .login-card {
  background: rgba(18, 18, 18, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 25px 50px rgba(0, 0, 0, 0.3),
    0 10px 20px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.dark .login-card::before {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

.dark .login-card:hover {
  box-shadow:
    0 35px 60px rgba(0, 0, 0, 0.4),
    0 15px 30px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Login content */
.login-content {
  position: relative;
  z-index: 1;
}

/* Header styles */
.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.logo-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-600));
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  animation: logoPulse 3s ease-in-out infinite;
}

@keyframes logoPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  }
}



.login-subtitle {
  font-family: 'Inter', sans-serif;
  color: #f1f5f9;
  font-size: 1.25rem;
  font-weight: 400;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Form styles */
.login-form {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  letter-spacing: 0.025em;
}

.form-input {
  width: 100%;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.form-input:focus {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary-color);
}

.password-input {
  position: relative;
  width: 100%;
}

.password-input .p-password {
  width: 100%;
}

.password-input .p-password input {
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.password-input .p-password input:focus {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.password-input .p-password .p-password-toggle {
  color: var(--text-color-secondary);
  transition: all 0.3s ease;
}

.password-input .p-password .p-password-toggle:hover {
  color: var(--primary-color);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem 0;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.custom-checkbox {
  transform: scale(1.1);
  transition: all 0.2s ease;
}

.checkbox-label {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  color: #4a5568;
  cursor: pointer;
  user-select: none;
}

.forgot-password {
  font-family: 'Inter', sans-serif;
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s ease;
  position: relative;
}

.forgot-password::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary-color);
  transition: width 0.3s ease;
}

.forgot-password:hover::after {
  width: 100%;
}

.forgot-password:hover {
  color: var(--primary-600);
  transform: translateX(2px);
}

/* Login button */
.login-button {
  width: 100%;
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-600));
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.login-button:hover::before {
  left: 100%;
}

.login-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
}

.login-button:active {
  transform: translateY(-1px);
}

.login-button:focus {
  outline: none;
  ring: 3px solid rgba(var(--primary-color-rgb), 0.3);
}

/* Footer */
.login-footer {
  text-align: center;
  padding-top: 2.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  margin-top: 1rem;
}

.dark .login-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.divider {
  position: relative;
  color: white;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  padding: 0 3rem;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 2.5rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4));
}

.divider::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  width: 2.5rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.4), transparent);
}

.dark .divider::before,
.dark .divider::after {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2));
}

.dark .divider::after {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.2), transparent);
}

/* Responsive design */
@media (max-width: 640px) {
  .login-container {
    padding: 1rem;
  }

  .login-card {
    padding: 2rem 1.5rem;
  }

  .form-options {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .shape-1,
  .shape-2,
  .shape-3,
  .shape-4,
  .shape-5 {
    display: none;
  }

  .glass-orbs {
    display: none;
  }

  .bubble-container {
    display: none;
  }

  .real-logo {
    width: 240px;
    height: 240px;
  }
}

@media (max-width: 1024px) {
  .bubble-1 {
    width: 60px;
    height: 60px;
  }

  .bubble-2 {
    width: 45px;
    height: 45px;
  }

  .bubble-3 {
    width: 75px;
    height: 75px;
  }

  .bubble-4 {
    width: 50px;
    height: 50px;
  }

  .bubble-5 {
    width: 65px;
    height: 65px;
  }

  .bubble-6 {
    width: 35px;
    height: 35px;
  }

  .bubble-7 {
    width: 45px;
    height: 45px;
  }

  .bubble-8 {
    width: 80px;
    height: 80px;
  }

  .bubble-9 {
    width: 40px;
    height: 40px;
  }

  .bubble-10 {
    width: 55px;
    height: 55px;
  }
}

/* Enhanced eye icons for password */
.pi-eye,
.pi-eye-slash {
  transform: scale(1.4);
  margin-right: 0.75rem;
  color: var(--text-color-secondary);
  transition: all 0.3s ease;
}

.pi-eye:hover,
.pi-eye-slash:hover {
  color: var(--primary-color);
  transform: scale(1.6);
}

/* Loading state for button */
.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.login-button:disabled:hover::before {
  animation: none;
}

/* Real logo styles */
.real-logo {
  width: 240px;
  height: 240px;
  object-fit: contain;
}
</style>
