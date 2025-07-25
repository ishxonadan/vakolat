<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">Yangi chipta yaratish</h1>
      <Button @click="goToTickets" icon="pi pi-arrow-left" label="Orqaga" severity="secondary" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Form Section -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Ma'lumotlarni kiriting</h3>
        
        <form @submit.prevent="createTicket" class="space-y-4">
          <div>
            <label for="passport" class="block text-sm font-medium mb-2">Pasport seriya va raqami *</label>
            <InputText 
              id="passport" 
              v-model="form.passport" 
              placeholder="AA1234567" 
              class="w-full"
              :class="{ 'p-invalid': errors.passport }"
              @input="formatPassport"
              @blur="checkExistingUser"
            />
            <small v-if="errors.passport" class="p-error">{{ errors.passport }}</small>
            <small class="text-gray-500">Masalan: AA1234567</small>
          </div>

          <div>
            <label for="fullname" class="block text-sm font-medium mb-2">
              F.I.Sh *
              <span v-if="isAutoFilled" class="text-xs text-blue-600 ml-2">(avtomatik to'ldirildi)</span>
            </label>
            <InputText 
              id="fullname" 
              v-model="form.fullname" 
              placeholder="To'liq ism familiya" 
              class="w-full"
              :class="{ 
                'p-invalid': errors.fullname,
                'border-blue-300 bg-blue-50': isAutoFilled && !isNameChanged
              }"
              @input="onNameChange"
            />
            <small v-if="errors.fullname" class="p-error">{{ errors.fullname }}</small>
            <small v-if="isNameChanged" class="text-orange-600">
              Ism o'zgartirildi - saqlanganda ma'lumotlar bazasida yangilanadi
            </small>
          </div>

          <div v-if="existingUser" class="p-3 bg-blue-50 border border-blue-200 rounded">
            <p class="text-sm text-blue-800">
              <i class="pi pi-info-circle mr-2"></i>
              Bu foydalanuvchi avval {{ existingUser.ticketHistory.length }} marta chipta olgan.
              <br>
              Ticket ID: <strong>{{ existingUser.ticketId }}</strong>
            </p>
          </div>

          <Button 
            type="submit" 
            :label="existingUser ? 'Yangi chipta yaratish' : 'Chipta yaratish'"
            icon="pi pi-plus" 
            :loading="loading"
            class="w-full"
          />
        </form>
      </div>

      <!-- Preview Section -->
      <div v-if="generatedTicket" class="card">
        <h3 class="text-lg font-semibold mb-4">
          {{ isExistingTicket ? 'Bugungi chipta' : 'Yaratilgan chipta' }}
        </h3>
        
        <div class="ticket-container">
          <div class="ticket-preview print-only" id="ticket-print">
            <!-- Header with library logo and name -->
            <div class="ticket-header">
              <div class="logo-section">
                <LibraryLogo />
              </div>
              <div class="library-info">
                <div class="library-title-line1">Alisher Navoiy nomidagi</div>
                <div class="library-title-line2">O'zbekiston Milliy kutubxonasi</div>
              </div>
            </div>
            
            <!-- Ticket type title -->
            <div class="ticket-title-section">
              <div class="title-main">Bir martalik chipta</div>
              <div class="title-russian">Разовый билет</div>
              <div class="title-english">One-time ticket</div>
            </div>

            <!-- Main content area with name, QR code, and order number -->
            <div class="ticket-content">
              <div class="left-section">
                <div class="user-name">{{ generatedTicket.fullname }}</div>
              </div>
              
              <div class="center-section">
                <img v-if="qrCode" :src="qrCode" alt="QR Code" class="qr-code" />
              </div>
              
              <div class="right-section">
                <div class="order-label">Tartib raqami</div>
                <div class="order-value">{{ generatedTicket.dailyOrderNumber }}</div>
              </div>
            </div>

            <!-- Ticket ID -->
            <div class="ticket-id-section">{{ generatedTicket.ticketId }}</div>

            <!-- Footer with validity date -->
            <div class="ticket-footer">
              <div class="validity-labels">
                <div>Amal qilish kuni:</div>
                <div>Действителен на:</div>
                <div>Valid on</div>
              </div>
              <div class="validity-date">{{ formatDate(generatedTicket.date) }}</div>
            </div>
          </div>
        </div>

        <div class="flex gap-2 mt-4 no-print">
          <Button 
            @click="printTicket" 
            icon="pi pi-print" 
            label="Chop etish" 
            severity="success"
            class="flex-1"
          />
          <Button 
            @click="createAnother" 
            icon="pi pi-plus" 
            label="Yana yaratish" 
            severity="info"
            class="flex-1"
          />
        </div>

        <div v-if="isExistingTicket" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded no-print">
          <p class="text-sm text-blue-800">
            <i class="pi pi-info-circle mr-2"></i>
            Bu foydalanuvchi bugun allaqachon chipta olgan. Yuqorida bugungi chipta ko'rsatilgan.
          </p>
        </div>

        <div v-else-if="isUpdate" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded no-print">
          <p class="text-sm text-yellow-800">
            <i class="pi pi-info-circle mr-2"></i>
            {{ updateMessage }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import apiService from '@/service/api.service';
import LibraryLogo from '@/components/LibraryLogo.vue';
import { getLibraryLogoSvg } from '@/utils/logo.js';

const toast = useToast();
const router = useRouter();

const loading = ref(false);
const generatedTicket = ref(null);
const qrCode = ref('');
const isUpdate = ref(false);
const isExistingTicket = ref(false);
const updateMessage = ref('');

const form = reactive({
  fullname: '',
  passport: ''
});

const errors = reactive({
  fullname: '',
  passport: ''
});

const isAutoFilled = ref(false);
const isNameChanged = ref(false);
const existingUser = ref(null);
const originalName = ref('');

const validateForm = () => {
  errors.fullname = '';
  errors.passport = '';
  
  if (!form.fullname.trim()) {
    errors.fullname = 'F.I.Sh kiritish majburiy';
    return false;
  }
  
  if (!form.passport.trim()) {
    errors.passport = 'Pasport ma\'lumotlari kiritish majburiy';
    return false;
  }
  
  const passportRegex = /^[A-Z]{2}\d{7}$/;
  if (!passportRegex.test(form.passport.replace(/\s/g, ''))) {
    errors.passport = 'Pasport formati noto\'g\'ri (AA1234567)';
    return false;
  }
  
  return true;
};

const formatPassport = (event) => {
  let value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (value.length > 2) {
    value = value.substring(0, 2) + value.substring(2, 9);
  }
  form.passport = value;
};

const checkExistingUser = async () => {
  if (!form.passport.trim() || form.passport.length < 9) return;
  
  try {
    // Check if user exists in LibraryUsers
    const response = await apiService.get(`/tickets/user/${form.passport.trim()}`);
    
    existingUser.value = response;
    form.fullname = response.fullname;
    originalName.value = response.fullname;
    isAutoFilled.value = true;
    isNameChanged.value = false;
    
    toast.add({ 
      severity: 'info', 
      summary: 'Ma\'lumot', 
      detail: `Bu foydalanuvchi avval ${response.ticketHistory.length} marta chipta olgan. Ism avtomatik to'ldirildi.`, 
      life: 4000 
    });
  } catch (error) {
    if (error.response?.status === 404) {
      // User doesn't exist - reset form
      existingUser.value = null;
      isAutoFilled.value = false;
      isNameChanged.value = false;
      originalName.value = '';
    } else {
      console.error('Error checking existing user:', error);
    }
  }
};

const onNameChange = () => {
  if (isAutoFilled.value && originalName.value) {
    isNameChanged.value = form.fullname !== originalName.value;
  }
};

const createTicket = async () => {
  if (!validateForm()) return;
  
  try {
    loading.value = true;

    const payload = {
      passport: form.passport.trim(),
      fullname: form.fullname.trim()
    };

    const response = await apiService.post('/tickets', payload);
    
    // Check if this is an existing ticket for today
    if (response.isExisting) {
      // Show existing ticket
      generatedTicket.value = response.existingTicket;
      isExistingTicket.value = true;
      isUpdate.value = false;
      
      toast.add({ 
        severity: 'info', 
        summary: 'Ma\'lumot', 
        detail: response.message, 
        life: 4000 
      });
    } else {
      // Get full ticket details for new ticket
      const ticketDetails = await apiService.get(`/tickets/${response.ticketId}`);
      generatedTicket.value = ticketDetails;
      isExistingTicket.value = false;
      isUpdate.value = response.isUpdate;
      updateMessage.value = response.message;
      
      toast.add({ 
        severity: 'success', 
        summary: 'Muvaffaqiyat', 
        detail: response.message, 
        life: 3000 
      });
    }
    
    // Get QR code
    const qrResponse = await apiService.get(`/tickets/${generatedTicket.value.ticketId}/qr`);
    qrCode.value = qrResponse.qrCode;
    
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: error.response?.data?.error || 'Chipta yaratishda xatolik', 
      life: 3000 
    });
  } finally {
    loading.value = false;
  }
};

const printTicket = () => {
  // Create a new window with only the ticket content
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Chipta - ${generatedTicket.value.ticketId}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              background: white;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 10px;
            }
            
            .ticket-preview {
              width: 250px;
              height: 300px;
              border: none !important;
              background: white;
              font-family: Arial, sans-serif;
              padding: 10px;
              display: flex;
              flex-direction: column;
              box-sizing: border-box;
            }
            
            .ticket-header {
              display: flex;
              align-items: flex-start;
              margin-bottom: 10px;
              gap: 8px;
            }
            
            .logo-section {
              flex-shrink: 0;
            }
            
            .library-info {
              flex: 1;
              text-align: left;
            }
            
            .library-title-line1 {
              font-size: 11px;
              font-weight: bold;
              line-height: 1.1;
              margin-bottom: 1px;
            }

            .library-title-line2 {
              font-size: 11px;
              font-weight: bold;
              line-height: 1.1;
            }
            
            .ticket-title-section {
              text-align: center;
              margin-bottom: 15px;
            }
            
            .title-main {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            
            .title-russian {
              font-size: 12px;
              margin-bottom: 1px;
            }
            
            .title-english {
              font-size: 12px;
            }
            
            .ticket-content {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 8px;
              flex: 1;
            }
            
            .left-section {
              flex: 1;
              text-align: left;
              padding-right: 10px;
            }
            
            .user-name {
              font-size: 11px;
              font-weight: bold;
              word-wrap: break-word;
            }
            
            .center-section {
              flex: 0 0 auto;
              display: flex;
              justify-content: center;
            }
            
            .qr-code {
              width: 60px;
              height: 60px;
              display: block;
            }
            
            .right-section {
              flex: 1;
              text-align: center;
              padding-left: 10px;
            }
            
            .order-label {
              font-size: 9px;
              margin-bottom: 2px;
            }
            
            .order-value {
              font-size: 14px;
              font-weight: bold;
            }
            
            .ticket-id-section {
              text-align: center;
              font-family: monospace;
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            
            .ticket-footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            
            .validity-labels {
              text-align: left;
              font-size: 9px;
              line-height: 1.1;
            }
            
            .validity-date {
              font-size: 12px;
              font-weight: bold;
            }
            
            @media print {
              body {
                padding: 0;
                margin: 0;
                min-height: auto;
              }
              
              .ticket-preview {
                width: 250px !important;
                height: 300px !important;
                border: none !important;
                margin: 0;
                page-break-inside: avoid;
              }
              
              @page {
                margin: 0.5cm;
                size: A4;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket-preview">
            <div class="ticket-header">
              <div class="logo-section">
               <svg width="80" height="25" viewBox="0 0 300 94" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(0,94) scale(0.1,-0.1)" fill="#000000" stroke="none">
                      <path d="M1290 918 c-175 -23 -297 -51 -383 -86 -16 -7 -33 -12 -38 -12 -5 0
-17 -4 -27 -9 -9 -5 -34 -17 -56 -26 -21 -9 -41 -26 -43 -36 -5 -18 -19 -19
-269 -19 l-264 0 0 -80 0 -80 30 0 30 0 0 -265 0 -265 -32 0 c-59 0 -238 -24
-238 -32 0 -10 7 -10 410 7 190 9 413 18 495 21 189 8 1057 8 1230 0 72 -3
283 -12 470 -21 402 -18 395 -17 395 -6 0 9 -124 26 -190 26 l-35 0 -3 268
c-2 264 -2 267 18 267 20 0 21 5 18 78 l-3 77 -250 3 c-246 2 -251 3 -260 24
-6 13 -29 28 -55 37 -25 9 -47 19 -50 22 -3 3 -22 9 -44 13 -21 4 -46 11 -55
16 -16 9 -74 25 -146 40 -22 5 -51 12 -65 15 -115 27 -458 41 -590 23z m355
-26 c5 -4 32 -7 60 -9 74 -4 319 -52 370 -73 11 -5 38 -14 60 -21 22 -6 45
-15 50 -19 6 -4 25 -11 43 -15 66 -14 27 -28 -73 -26 -99 2 -110 4 -110 22 0
5 -3 9 -7 9 -5 0 -246 0 -538 0 -419 0 -529 -3 -527 -12 1 -10 -24 -14 -95
-16 -62 -2 -98 1 -98 7 0 6 12 14 28 17 15 4 32 10 37 14 6 4 51 20 100 35 50
15 99 31 110 35 20 8 150 33 255 48 62 10 320 12 335 4z m377 -209 c-2 -27 -6
-49 -7 -51 -4 -5 -1007 -3 -1012 2 -3 3 -6 25 -8 50 l-3 46 518 0 518 0 -6
-47z m-1050 -29 c2 -25 1 -47 -1 -50 -2 -2 -168 -4 -368 -4 l-363 0 0 50 0 50
253 2 c138 2 302 2 364 0 l111 -3 4 -45z m1808 -4 l0 -50 -371 0 c-334 0 -371
2 -365 16 3 9 6 31 6 50 l0 34 365 0 365 0 0 -50z m-1114 -50 l64 0 -1 -67 c0
-57 -2 -65 -12 -49 -25 42 -74 84 -109 95 -21 7 -38 17 -38 23 0 6 7 7 16 4 9
-3 45 -6 80 -6z m358 -21 c-3 -5 13 -9 35 -9 22 0 42 -4 46 -9 3 -5 21 -7 41
-4 l35 6 -1 -204 c-2 -181 0 -204 15 -207 14 -3 16 18 15 203 -1 114 1 209 4
212 2 3 11 1 18 -3 7 -5 26 -9 42 -9 l28 0 -1 -202 c-2 -180 0 -203 14 -203
14 0 16 24 15 206 -1 113 1 208 4 211 3 3 13 2 23 -2 10 -4 33 -7 51 -6 l33 3
-1 -204 c-1 -151 1 -203 10 -203 9 0 12 52 11 208 -2 170 0 207 12 207 7 0 17
-3 21 -7 3 -4 21 -7 39 -7 l32 -1 2 -200 c1 -130 5 -201 12 -203 8 -3 11 63
11 207 l0 211 80 0 80 0 0 -230 0 -230 -375 0 -375 0 0 251 c0 222 2 250 15
239 8 -7 12 -16 9 -21z m-991 -221 l-2 -243 -366 -3 -365 -2 0 230 0 230 68 0
c38 0 72 -3 76 -7 4 -4 23 -6 42 -4 l34 3 0 -206 c0 -179 2 -206 15 -206 14 0
16 27 15 208 -1 142 2 207 9 206 6 -1 28 -2 49 -2 l37 -2 -3 -205 c-4 -204 -4
-205 18 -205 21 0 21 2 19 207 -1 134 2 208 9 211 6 2 13 -1 16 -7 4 -5 22 -7
41 -4 l35 6 0 -207 c0 -179 2 -206 15 -206 14 0 16 27 15 208 -1 181 0 207 14
210 9 2 16 -1 16 -7 0 -6 12 -8 30 -4 l30 6 0 -207 c0 -179 2 -206 15 -206 14
0 16 27 15 208 l-2 207 31 3 c19 2 31 9 31 18 0 8 10 14 23 14 l22 0 -2 -242z
m250 135 c4 -58 7 -170 7 -247 l0 -141 -112 1 -113 1 -3 247 -2 246 108 0 109
0 6 -107z m141 86 c-44 -20 -104 -80 -104 -104 0 -8 -4 -15 -8 -15 -6 0 -7 94
-2 138 0 1 35 2 78 1 l77 -1 -41 -19z m547 -228 l1 -243 -113 -1 -114 -1 -1
159 c-1 88 1 200 4 248 l5 88 109 -3 108 -3 1 -244z m-363 203 c56 -28 102
-82 102 -121 0 -12 5 -25 10 -28 15 -9 2 -25 -21 -25 -13 0 -19 7 -19 23 0 33
-52 101 -91 121 -86 43 -189 -3 -222 -99 -17 -49 -47 -60 -47 -18 0 45 58 120
114 148 64 32 109 32 174 -1z m-17 -60 c29 -15 55 -49 65 -88 10 -40 -13 -32
-36 14 -25 48 -70 74 -115 66 -40 -8 -82 -45 -91 -80 -6 -24 -34 -38 -34 -17
0 18 29 78 44 90 46 38 110 44 167 15z m-10 -60 c11 -9 19 -27 19 -39 0 -13 7
-25 15 -29 12 -4 15 -30 15 -143 l0 -138 -105 0 -104 0 -3 139 c-2 104 0 140
10 143 6 3 12 16 12 28 0 36 47 68 89 61 18 -3 42 -13 52 -22z m-231 -214 c0
-118 -2 -140 -15 -140 -13 0 -15 22 -15 140 0 118 2 140 15 140 13 0 15 -22
15 -140z m48 -3 c2 -117 0 -137 -13 -137 -13 0 -15 21 -15 141 0 108 3 140 13
137 9 -3 13 -43 15 -141z m272 3 c0 -87 -4 -140 -10 -140 -6 0 -10 53 -10 140
0 87 4 140 10 140 6 0 10 -53 10 -140z m48 3 c-2 -108 -6 -138 -16 -138 -11 0
-14 28 -13 133 0 72 0 134 1 137 0 3 7 5 15 5 13 0 15 -20 13 -137z m-418
-142 c0 -4 -147 -11 -327 -14 -336 -6 -542 -13 -625 -22 -46 -5 -48 -5 -48 20
l0 25 500 0 c276 0 500 -4 500 -9z m1450 -17 l0 -25 -77 5 c-162 12 -298 18
-600 23 -172 3 -310 10 -307 14 3 5 225 9 495 9 l489 0 0 -26z"/>
                    </g>
                  </svg>
              </div>
              <div class="library-info">
                <div class="library-title-line1">Alisher Navoiy nomidagi</div>
                <div class="library-title-line2">O'zbekiston Milliy kutubxonasi</div>
              </div>
            </div>
            
            <div class="ticket-title-section">
              <div class="title-main">Bir martalik chipta</div>
              <div class="title-russian">Разовый билет</div>
              <div class="title-english">One-time ticket</div>
            </div>

            <div class="ticket-content">
              <div class="left-section">
                <div class="user-name">${generatedTicket.value.fullname}</div>
              </div>
              
              <div class="center-section">
                <img src="${qrCode.value}" alt="QR Code" class="qr-code" />
              </div>
              
              <div class="right-section">
                <div class="order-label">Tartib raqami</div>
                <div class="order-value">${generatedTicket.value.dailyOrderNumber}</div>
              </div>
            </div>

            <div class="ticket-id-section">${generatedTicket.value.ticketId}</div>

            <div class="ticket-footer">
              <div class="validity-labels">
                <div>Amal qilish kuni:</div>
                <div>Действителен на:</div>
                <div>Valid on</div>
              </div>
              <div class="validity-date">${formatDate(generatedTicket.value.date)}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
};

const createAnother = () => {
  form.fullname = '';
  form.passport = '';
  generatedTicket.value = null;
  qrCode.value = '';
  isUpdate.value = false;
  isExistingTicket.value = false;
  isAutoFilled.value = false;
  isNameChanged.value = false;
  existingUser.value = null;
  originalName.value = '';
  updateMessage.value = '';
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('uz-UZ');
};

const goToTickets = () => {
  router.push('/tickets');
};
</script>

<style scoped>
.ticket-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.ticket-preview {
  width: 250px;
  height: 320px;
  border: none;
  background: white;
  font-family: Arial, sans-serif;
  padding: 10px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.ticket-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 6px;
}

.logo-section {
  flex-shrink: 0;
}

.library-info {
  flex: 1;
  text-align: left;
}

.library-title-line1 {
  font-size: 11px;
  font-weight: bold;
  line-height: 1.1;
  margin-bottom: 1px;
}

.library-title-line2 {
  font-size: 11px;
  font-weight: bold;
  line-height: 1.1;
}

.ticket-title-section {
  text-align: center;
  margin-bottom: 10px;
}

.title-main {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 2px;
}

.title-russian {
  font-size: 14px;
  margin-bottom: 1px;
}

.title-english {
  font-size: 14px;
}

.ticket-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
  flex: 1;
}

.left-section {
  flex: 1;
  text-align: left;
  padding-right: 8px;
}

.user-name {
  font-size: 11px;
  font-weight: bold;
  word-wrap: break-word;
}

.center-section {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.qr-code {
  width: 80px;
  height: 80px;
  display: block;
}

.right-section {
  flex: 1;
  text-align: center;
  padding-left: 8px;
}

.order-label {
  font-size: 11px;
  margin-bottom: 2px;
}

.order-value {
  font-size: 14px;
  font-weight: bold;
}

.ticket-id-section {
  text-align: center;
  font-family: monospace;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 8px;
}

.ticket-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.validity-labels {
  text-align: left;
  font-size: 11px;
  line-height: 1.1;
}

.validity-date {
  font-size: 12px;
  font-weight: bold;
}

.no-print {
  display: block;
}

@media print {
  .no-print {
    display: none !important;
  }
}
</style>
