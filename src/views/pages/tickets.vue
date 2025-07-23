<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">Chiptalar</h1>
      <Button @click="$router.push('/ticket_add')" icon="pi pi-plus" label="Yangi chipta" />
    </div>

    <DataTable 
      :value="tickets" 
      :loading="loading"
      paginator 
      :rows="10"
      :rowsPerPageOptions="[5, 10, 20]"
      paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
      currentPageReportTemplate="{first} dan {last} gacha, jami {totalRecords} ta"
      responsiveLayout="scroll"
    >
      <Column field="ticketId" header="Chipta ID" sortable>
        <template #body="slotProps">
          <span class="font-mono font-semibold">{{ slotProps.data.ticketId }}</span>
        </template>
      </Column>
      <Column field="fullname" header="F.I.Sh" sortable />
      <Column field="passport" header="Pasport" sortable>
        <template #body="slotProps">
          <span class="font-mono">{{ slotProps.data.passport }}</span>
        </template>
      </Column>
      <Column field="date" header="Sana" sortable>
        <template #body="slotProps">
          {{ formatDate(slotProps.data.date) }}
        </template>
      </Column>
      <Column field="createdAt" header="Yaratilgan" sortable>
        <template #body="slotProps">
          {{ formatDateTime(slotProps.data.createdAt) }}
        </template>
      </Column>
      <Column header="Amallar">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button 
              @click="viewTicket(slotProps.data)" 
              icon="pi pi-eye" 
              size="small" 
              severity="info"
              v-tooltip="'Ko\'rish'"
            />
            <Button 
              @click="printTicket(slotProps.data)" 
              icon="pi pi-print" 
              size="small" 
              severity="success"
              v-tooltip="'Chop etish'"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Ticket View Dialog -->
    <Dialog v-model:visible="showTicketDialog" modal header="Chipta ma'lumotlari" :style="{ width: '700px' }">
      <div v-if="selectedTicket" class="ticket-container">
        <div class="ticket-preview" id="ticket-print-dialog">
          <!-- Header with building icon and library name -->
          <div class="ticket-header">
            <div class="building-section">
              <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="35" width="70" height="18" stroke="black" stroke-width="1.5" fill="none"/>
                <rect x="20" y="22" width="12" height="13" stroke="black" stroke-width="1.5" fill="none"/>
                <rect x="35" y="22" width="15" height="13" stroke="black" stroke-width="1.5" fill="none"/>
                <rect x="52" y="22" width="12" height="13" stroke="black" stroke-width="1.5" fill="none"/>
                <rect x="28" y="12" width="28" height="10" stroke="black" stroke-width="1.5" fill="none"/>
                <path d="M15 35 L42 8 L70 35" stroke="black" stroke-width="1.5" fill="none"/>
                <circle cx="42" cy="28" r="4" stroke="black" stroke-width="1.5" fill="none"/>
                <rect x="32" y="25" width="6" height="10" stroke="black" stroke-width="1" fill="none"/>
                <rect x="46" y="25" width="6" height="10" stroke="black" stroke-width="1" fill="none"/>
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
              <div class="user-name">{{ selectedTicket.fullname }}</div>
            </div>
            
            <div class="center-section">
              <img v-if="qrCode" :src="qrCode" alt="QR Code" class="qr-code" />
            </div>
            
            <div class="right-section">
              <div class="order-label">Tartib raqami</div>
              <div class="order-value">{{ selectedTicket.ticketNumber }}</div>
            </div>
          </div>

          <!-- Ticket ID -->
          <div class="ticket-id-section">{{ selectedTicket.ticketId }}</div>

          <!-- Footer with validity date -->
          <div class="ticket-footer">
            <div class="validity-labels">
              <div>Amal qilish kuni:</div>
              <div>Действителен на:</div>
              <div>Valid on</div>
            </div>
            <div class="validity-date">{{ formatDate(selectedTicket.date) }}</div>
          </div>
        </div>

        <div class="mt-4 text-xs text-gray-500 text-center no-print">
          <p>Bu pasport bilan {{ ticketCount }} marta ro'yxatdan o'tilgan</p>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import apiService from '@/service/api.service';

const toast = useToast();
const tickets = ref([]);
const loading = ref(false);
const showTicketDialog = ref(false);
const selectedTicket = ref(null);
const qrCode = ref('');
const ticketCount = ref(0);

const loadTickets = async () => {
  try {
    loading.value = true;
    const data = await apiService.get('/tickets');
    tickets.value = data;
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Chiptalarni yuklashda xatolik', 
      life: 3000 
    });
  } finally {
    loading.value = false;
  }
};

const viewTicket = async (ticket) => {
  try {
    selectedTicket.value = ticket;
    
    // Load QR code
    const qrResponse = await apiService.get(`/tickets/${ticket.ticketId}/qr`);
    qrCode.value = qrResponse.qrCode;
    
    // Load ticket count for this passport
    const countResponse = await apiService.get(`/tickets/count/${ticket.passport}`);
    ticketCount.value = countResponse.count;
    
    showTicketDialog.value = true;
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Chipta ma\'lumotlarini yuklashda xatolik', 
      life: 3000 
    });
  }
};

const printTicket = async (ticket) => {
  try {
    // Load QR code first
    const qrResponse = await apiService.get(`/tickets/${ticket.ticketId}/qr`);
    const ticketQrCode = qrResponse.qrCode;
    
    // Create a new window with only the ticket content
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Chipta - ${ticket.ticketId}</title>
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
                padding: 20px;
              }
              
              .ticket-preview {
                width: 600px;
                height: 400px;
                border: 3px solid #000;
                background: white;
                font-family: Arial, sans-serif;
                padding: 25px;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
              }
              
              .ticket-header {
                display: flex;
                align-items: flex-start;
                margin-bottom: 25px;
                gap: 15px;
              }
              
              .building-section {
                flex-shrink: 0;
              }
              
              .library-info {
                flex: 1;
                text-align: left;
              }
              
              .library-title {
                font-size: 18px;
                font-weight: bold;
                line-height: 1.2;
                margin-bottom: 3px;
              }
              
              .library-subtitle {
                font-size: 16px;
                font-weight: bold;
                line-height: 1.2;
              }
              
              .ticket-title-section {
                text-align: center;
                margin-bottom: 30px;
              }
              
              .title-main {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              
              .title-russian {
                font-size: 20px;
                margin-bottom: 3px;
              }
              
              .title-english {
                font-size: 20px;
              }
              
              .ticket-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 25px;
                flex: 1;
              }
              
              .left-section {
                flex: 1;
                text-align: left;
                padding-right: 15px;
              }
              
              .user-name {
                font-size: 16px;
                font-weight: bold;
                word-wrap: break-word;
              }
              
              .center-section {
                flex: 0 0 auto;
                display: flex;
                justify-content: center;
              }
              
              .qr-code {
                width: 120px;
                height: 120px;
                display: block;
              }
              
              .right-section {
                flex: 1;
                text-align: right;
                padding-left: 15px;
              }
              
              .order-label {
                font-size: 12px;
                margin-bottom: 3px;
              }
              
              .order-value {
                font-size: 24px;
                font-weight: bold;
              }
              
              .ticket-id-section {
                text-align: center;
                font-family: monospace;
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 20px;
              }
              
              .ticket-footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
              }
              
              .validity-labels {
                text-align: left;
                font-size: 12px;
                line-height: 1.2;
              }
              
              .validity-date {
                font-size: 16px;
                font-weight: bold;
              }
              
              @media print {
                body {
                  padding: 0;
                  margin: 0;
                }
                
                .ticket-preview {
                  width: 100%;
                  height: auto;
                  border: 3px solid #000 !important;
                  margin: 0;
                }
                
                @page {
                  margin: 1cm;
                  size: A4 landscape;
                }
              }
            </style>
          </head>
          <body>
            <div class="ticket-preview">
              <div class="ticket-header">
                <div class="building-section">
                  <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="35" width="70" height="18" stroke="black" stroke-width="1.5" fill="none"/>
                    <rect x="20" y="22" width="12" height="13" stroke="black" stroke-width="1.5" fill="none"/>
                    <rect x="35" y="22" width="15" height="13" stroke="black" stroke-width="1.5" fill="none"/>
                    <rect x="52" y="22" width="12" height="13" stroke="black" stroke-width="1.5" fill="none"/>
                    <rect x="28" y="12" width="28" height="10" stroke="black" stroke-width="1.5" fill="none"/>
                    <path d="M15 35 L42 8 L70 35" stroke="black" stroke-width="1.5" fill="none"/>
                    <circle cx="42" cy="28" r="4" stroke="black" stroke-width="1.5" fill="none"/>
                    <rect x="32" y="25" width="6" height="10" stroke="black" stroke-width="1" fill="none"/>
                    <rect x="46" y="25" width="6" height="10" stroke="black" stroke-width="1" fill="none"/>
                  </svg>
                </div>
                <div class="library-info">
                  <div class="library-title">Alisher Navoiy nomidagi</div>
                  <div class="library-subtitle">O'zbekiston Milliy kutubxonasi</div>
                </div>
              </div>
              
              <div class="ticket-title-section">
                <div class="title-main">Bir martalik chipta</div>
                <div class="title-russian">Разовый билет</div>
                <div class="title-english">One-time ticket</div>
              </div>

              <div class="ticket-content">
                <div class="left-section">
                  <div class="user-name">${ticket.fullname}</div>
                </div>
                
                <div class="center-section">
                  <img src="${ticketQrCode}" alt="QR Code" class="qr-code" />
                </div>
                
                <div class="right-section">
                  <div class="order-label">Tartib raqami</div>
                  <div class="order-value">${ticket.ticketNumber}</div>
                </div>
              </div>

              <div class="ticket-id-section">${ticket.ticketId}</div>

              <div class="ticket-footer">
                <div class="validity-labels">
                  <div>Amal qilish kuni:</div>
                  <div>Действителен на:</div>
                  <div>Valid on</div>
                </div>
                <div class="validity-date">${formatDate(ticket.date)}</div>
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
    
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Xato', 
      detail: 'Chipta chop etishda xatolik', 
      life: 3000 
    });
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('uz-UZ');
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('uz-UZ');
};

onMounted(() => {
  loadTickets();
});
</script>

<style scoped>
.ticket-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.ticket-preview {
  width: 600px;
  height: 400px;
  border: 3px solid #000;
  background: white;
  font-family: Arial, sans-serif;
  padding: 25px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.ticket-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 25px;
  gap: 15px;
}

.building-section {
  flex-shrink: 0;
}

.library-info {
  flex: 1;
  text-align: left;
}

.library-title {
  font-size: 18px;
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 3px;
}

.library-subtitle {
  font-size: 16px;
  font-weight: bold;
  line-height: 1.2;
}

.ticket-title-section {
  text-align: center;
  margin-bottom: 30px;
}

.title-main {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.title-russian {
  font-size: 20px;
  margin-bottom: 3px;
}

.title-english {
  font-size: 20px;
}

.ticket-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;
  flex: 1;
}

.left-section {
  flex: 1;
  text-align: left;
  padding-right: 15px;
}

.user-name {
  font-size: 16px;
  font-weight: bold;
  word-wrap: break-word;
}

.center-section {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
}

.qr-code {
  width: 120px;
  height: 120px;
  display: block;
}

.right-section {
  flex: 1;
  text-align: right;
  padding-left: 15px;
}

.order-label {
  font-size: 12px;
  margin-bottom: 3px;
}

.order-value {
  font-size: 24px;
  font-weight: bold;
}

.ticket-id-section {
  text-align: center;
  font-family: monospace;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
}

.ticket-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.validity-labels {
  text-align: left;
  font-size: 12px;
  line-height: 1.2;
}

.validity-date {
  font-size: 16px;
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
