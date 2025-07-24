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
    // Create the HTML structure using DOM methods instead of document.write
    const html = printWindow.document.createElement('html');
    const head = printWindow.document.createElement('head');
    const body = printWindow.document.createElement('body');
    
    // Add title
    const title = printWindow.document.createElement('title');
    title.textContent = `Chipta - ${generatedTicket.value.ticketId}`;
    head.appendChild(title);
    
    // Add styles
    const style = printWindow.document.createElement('style');
    style.textContent = `
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
        width: 250px !important;
        height: 300px !important;
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
    `;
    head.appendChild(style);
    
    // Create ticket content
    const ticketDiv = printWindow.document.createElement('div');
    ticketDiv.className = 'ticket-preview';
    ticketDiv.innerHTML = `
      <div class="ticket-header">
        <div class="logo-section">
          ${getLibraryLogoSvg()}
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
    `;
    
    body.appendChild(ticketDiv);
    html.appendChild(head);
    html.appendChild(body);
    printWindow.document.appendChild(html);
    
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
