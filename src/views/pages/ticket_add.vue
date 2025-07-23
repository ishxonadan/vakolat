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
            <label for="fullname" class="block text-sm font-medium mb-2">F.I.Sh *</label>
            <InputText 
              id="fullname" 
              v-model="form.fullname" 
              placeholder="To'liq ism familiya" 
              class="w-full"
              :class="{ 'p-invalid': errors.fullname }"
            />
            <small v-if="errors.fullname" class="p-error">{{ errors.fullname }}</small>
          </div>

          <div>
            <label for="passport" class="block text-sm font-medium mb-2">Pasport seriya va raqami *</label>
            <InputText 
              id="passport" 
              v-model="form.passport" 
              placeholder="AA1234567" 
              class="w-full"
              :class="{ 'p-invalid': errors.passport }"
              @input="formatPassport"
            />
            <small v-if="errors.passport" class="p-error">{{ errors.passport }}</small>
            <small class="text-gray-500">Masalan: AA1234567</small>
          </div>

          <Button 
            type="submit" 
            label="Chipta yaratish" 
            icon="pi pi-plus" 
            :loading="loading"
            class="w-full"
          />
        </form>
      </div>

      <!-- Preview Section -->
      <div v-if="generatedTicket" class="card">
        <h3 class="text-lg font-semibold mb-4">Yaratilgan chipta</h3>
        
        <div class="ticket-container">
          <div class="ticket-preview print-only" id="ticket-print">
            <!-- Header with building icon and library name -->
            <div class="ticket-header">
              <div class="building-section">
                <svg width="60" height="45" viewBox="0 0 60 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="28" width="50" height="14" stroke="black" stroke-width="1.2" fill="none"/>
                  <rect x="15" y="18" width="8" height="10" stroke="black" stroke-width="1.2" fill="none"/>
                  <rect x="26" y="18" width="10" height="10" stroke="black" stroke-width="1.2" fill="none"/>
                  <rect x="38" y="18" width="8" height="10" stroke="black" stroke-width="1.2" fill="none"/>
                  <rect x="20" y="10" width="20" height="8" stroke="black" stroke-width="1.2" fill="none"/>
                  <path d="M12 28 L30 6 L48 28" stroke="black" stroke-width="1.2" fill="none"/>
                  <circle cx="30" cy="21" r="3" stroke="black" stroke-width="1.2" fill="none"/>
                </svg>
              </div>
              <div class="library-info">
                <div class="library-title">Alisher Navoiy nomidagi</div>
                <div class="library-subtitle">O'zbekiston Milliy kutubxonasi</div>
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
                <div class="order-value">{{ generatedTicket.ticketNumber }}</div>
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

        <div v-if="isUpdate" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded no-print">
          <p class="text-sm text-yellow-800">
            <i class="pi pi-info-circle mr-2"></i>
            Bu pasport bilan avval ro'yxatdan o'tilgan. Chipta sanasi yangilandi.
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

const toast = useToast();
const router = useRouter();

const loading = ref(false);
const generatedTicket = ref(null);
const qrCode = ref('');
const isUpdate = ref(false);

const form = reactive({
  fullname: '',
  passport: ''
});

const errors = reactive({
  fullname: '',
  passport: ''
});

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

const createTicket = async () => {
  if (!validateForm()) return;
  
  try {
    loading.value = true;
    
    const response = await apiService.post('/tickets', {
      fullname: form.fullname.trim(),
      passport: form.passport.trim()
    });
    
    // Get full ticket details
    const ticketDetails = await apiService.get(`/tickets/${response.ticketId}`);
    generatedTicket.value = ticketDetails;
    
    // Get QR code
    const qrResponse = await apiService.get(`/tickets/${response.ticketId}/qr`);
    qrCode.value = qrResponse.qrCode;
    
    isUpdate.value = response.isUpdate;
    
    toast.add({ 
      severity: 'success', 
      summary: 'Muvaffaqiyat', 
      detail: response.message, 
      life: 3000 
    });
    
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
  const ticketElement = document.getElementById('ticket-print');
  
  if (printWindow && ticketElement) {
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
              width: 480px;
              height: 300px;
              border: 2px solid #000;
              background: white;
              font-family: Arial, sans-serif;
              padding: 15px;
              display: flex;
              flex-direction: column;
              box-sizing: border-box;
            }
            
            .ticket-header {
              display: flex;
              align-items: flex-start;
              margin-bottom: 15px;
              gap: 10px;
            }
            
            .building-section {
              flex-shrink: 0;
            }
            
            .library-info {
              flex: 1;
              text-align: left;
            }
            
            .library-title {
              font-size: 14px;
              font-weight: bold;
              line-height: 1.1;
              margin-bottom: 2px;
            }
            
            .library-subtitle {
              font-size: 12px;
              font-weight: bold;
              line-height: 1.1;
            }
            
            .ticket-title-section {
              text-align: center;
              margin-bottom: 20px;
            }
            
            .title-main {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 3px;
            }
            
            .title-russian {
              font-size: 14px;
              margin-bottom: 2px;
            }
            
            .title-english {
              font-size: 14px;
            }
            
            .ticket-content {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 15px;
              flex: 1;
            }
            
            .left-section {
              flex: 1;
              text-align: left;
              padding-right: 10px;
            }
            
            .user-name {
              font-size: 13px;
              font-weight: bold;
              word-wrap: break-word;
            }
            
            .center-section {
              flex: 0 0 auto;
              display: flex;
              justify-content: center;
            }
            
            .qr-code {
              width: 80px;
              height: 80px;
              display: block;
            }
            
            .right-section {
              flex: 1;
              text-align: right;
              padding-left: 10px;
            }
            
            .order-label {
              font-size: 9px;
              margin-bottom: 2px;
            }
            
            .order-value {
              font-size: 18px;
              font-weight: bold;
            }
            
            .ticket-id-section {
              text-align: center;
              font-family: monospace;
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 12px;
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
                width: 480px !important;
                height: 300px !important;
                border: 2px solid #000 !important;
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
          ${ticketElement.outerHTML}
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
  width: 480px;
  height: 300px;
  border: 2px solid #000;
  background: white;
  font-family: Arial, sans-serif;
  padding: 15px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.ticket-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 15px;
  gap: 10px;
}

.building-section {
  flex-shrink: 0;
}

.library-info {
  flex: 1;
  text-align: left;
}

.library-title {
  font-size: 14px;
  font-weight: bold;
  line-height: 1.1;
  margin-bottom: 2px;
}

.library-subtitle {
  font-size: 12px;
  font-weight: bold;
  line-height: 1.1;
}

.ticket-title-section {
  text-align: center;
  margin-bottom: 20px;
}

.title-main {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 3px;
}

.title-russian {
  font-size: 14px;
  margin-bottom: 2px;
}

.title-english {
  font-size: 14px;
}

.ticket-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  flex: 1;
}

.left-section {
  flex: 1;
  text-align: left;
  padding-right: 10px;
}

.user-name {
  font-size: 13px;
  font-weight: bold;
  word-wrap: break-word;
}

.center-section {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
}

.qr-code {
  width: 80px;
  height: 80px;
  display: block;
}

.right-section {
  flex: 1;
  text-align: right;
  padding-left: 10px;
}

.order-label {
  font-size: 9px;
  margin-bottom: 2px;
}

.order-value {
  font-size: 18px;
  font-weight: bold;
}

.ticket-id-section {
  text-align: center;
  font-family: monospace;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
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

.no-print {
  display: block;
}

@media print {
  .no-print {
    display: none !important;
  }
}
</style>
