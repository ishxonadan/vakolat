<script setup>
import { ref } from 'vue';

const passportIssuedDate = ref(null);
const passportExpireDate = ref(null);
const contractDate = ref(null);
const contractStart = ref(null);
const dropdownValue = ref(null);
const weekStart = ref(null);
const weekEnd = ref(null);
const workDayStarts = ref(null);
const workDayEnds = ref(null);


const dropdownValues = ref([
    { name: 'Бессрочный', code: 'бессрочный' },
    { name: 'Срочный', code: 'срочный' },
]);

const dropdownValues2 = ref([
    { "name": "понедельника", "code": "1" },
    { "name": "вторника", "code": "2" },
    { "name": "среды", "code": "3" },
    { "name": "четверга", "code": "4" },
    { "name": "пятницы", "code": "5" },
    { "name": "субботы", "code": "6" },
    { "name": "воскресенье", "code": "7" }
]);

const dropdownValues3 = ref([
    { name: 'вторник', code: '2' },
    { name: 'среду', code: '3' },
    { name: 'четверг', code: '4' },
    { name: 'пятницу', code: '5' },
    { name: 'субботу', code: '6' },
    { name: 'воскресенье', code: '7' }
]);

// const dropdownValues2 = ref([
//     { "name": "Понедельника", "code": "С Понедельника", "day": 1 },
//     { "name": "Вторника", "code": "Со Вторника", "day": 2 },
//     { "name": "Среды", "code": "Со Среды", "day": 3 },
//     { "name": "Четверга", "code": "С Четверга", "day": 4 },
//     { "name": "Пятницы", "code": "С Пятницы", "day": 5 },
//     { "name": "Субботы", "code": "С Субботы", "day": 6 },
//     { "name": "Воскресенье", "code": "С Воскресенье", "day": 7 }
// ]);

// const dropdownValues3 = ref([
//     { name: 'Вторник', code: 'Вторник', day: 2 },
//     { name: 'Среду', code: 'Среду', day: 3 },
//     { name: 'Четверг', code: 'Четверг', day: 4 },
//     { name: 'Пятницу', code: 'Пятницу', day: 5 },
//     { name: 'Субботу', code: 'Субботу', day: 6 },
//     { name: 'Воскресенье', code: 'Воскресенье', day: 7 }
// ]);

const clock = ref([
    { name: '6.00', code: '6.00' },
    { name: '7.00', code: '7.00' },
    { name: '8.00', code: '8.00' },
    { name: '9.00', code: '9.00' },
    { name: '10.00', code: '10.00' },
    { name: '11.00', code: '11.00' },
    { name: '12.00', code: '12.00' },
    { name: '13.00', code: '13.00' },
    { name: '14.00', code: '14.00' },
    { name: '15.00', code: '15.00' },
    { name: '16.00', code: '16.00' },
    { name: '17.00', code: '17.00' },
    { name: '18.00', code: '18.00' },
    { name: '19.00', code: '19.00' },
    { name: '20.00', code: '20.00' },
    { name: '21.00', code: '21.00' },
    { name: '22.00', code: '22.00' },
    { name: '23.00', code: '23.00' },
    { name: '24.00', code: '24.00' },
    { name: '01.00', code: '01.00' },
    { name: '02.00', code: '02.00' },
    { name: '03.00', code: '03.00' },
    { name: '04.00', code: '04.00' },
    { name: '05.00', code: '05.00' }
]);


function handleLatinInput(event) {
    const input = event.target.value;
    const regex = /^[A-Za-z\s-'*]*$/;
    if (regex.test(input)) {
        event.target.value = input.toUpperCase();
    } else {
        event.target.value = input.replace(/[^A-Za-z\s-']/g, '').toUpperCase(); // Filter invalid characters and convert to uppercase
    }
}

function handleCyrillicInput(event) {
    const input = event.target.value;
    const regex = /^[А-Яа-яЁё\s-'*]*$/;
    if (!regex.test(input)) {
        event.target.value = input.replace(/[^А-Яа-яЁё\s-']/g, '').toUpperCase();
    }
}

function countDays(one, two) {
    console.log(one,two);
    console.log(typeof one);
    
    
    let days = two - one;
    let result = "";

    switch (days) {
        case 2:
            result = "двухдневная";
            break;
        case 3:
            result = "трёхдневная";
            break;
        case 4:
            result = "четырёхдневная";
            break;
        case 5:
            result = "пятидневная";
            break;
        case 6:
            result = "шестидневная";
            break;
        case 7:
            result = "семидневная";
            break;
        default:
            result = "неизвестное количество дней";
            break;
    }

    console.log(result);
    

    return result;
}

function saveData() {
    console.log(workDayStarts.value);
    

    const data = {
        contractNum: document.getElementById('contract-number').value,
        fullnameLatin: document.getElementById('fullname-latin').value,
        fullnameCyrillic: document.getElementById('fullname-cyrillic').value,
        passportSeries: document.getElementById('passport-series').value,
        passportNumber: document.getElementById('passport-number').value,
        passportIssued: document.getElementById('passport-issued').value,
        passportIssuedDate: passportIssuedDate.value,
        passportExpireDate: passportExpireDate.value,
        contractDate: contractDate.value,
        contractStart: contractStart.value,
        address: document.getElementById('address').value,
        inn: document.getElementById('inn').value,
        pinfl: document.getElementById('pinfl').value,
        inps: document.getElementById('inps').value,
        position: document.getElementById('position').value,
        contractType: dropdownValue.value ? dropdownValue.value.code : '',
        supervision: document.getElementById('supervision').value,
        region: document.getElementById('region').value,
        enterpriseAddress: document.getElementById('enterprise-address').value,
        salary: document.getElementById('salary').value,
        weekStart: weekStart.value ? weekStart.value.code : '',
        weekEnd: weekEnd.value ? weekEnd.value.code : '',
        workDayStarts: workDayStarts.value ? workDayStarts.value.code : '',
        workDayEnds: workDayEnds.value ? workDayEnds.value.code : '',
        probationPeriod: document.getElementById('probation-period').value,
        phone: document.getElementById('phone').value,
    };

    fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => {
        if (response.ok) {
            alert('Персонал успешно добавлен!');
        } else {
            alert('Failed to save data.');
        }
    }).catch(error => {
        console.error('Error:', error);
        alert('An error occurred while saving data.');
    });
}
</script>

<template>

    <Fluid class="flex flex-col md:flex-row gap-4">
        <div class="md:w-full">
            <div class="card flex flex-col gap-4">
                <div class="font-semibold text-2xl">Добавление нового персонала</div>
                <div class="flex space-x-2">
                    <div class="md:w-1/2">
                        <InputText id="contract-number" type="text" placeholder="Номер контракта" autocomplete="nope" />
                    </div>
                    <div class="md:w-1/2">
                    </div>

                </div>
                <div class="flex space-x-2">
                    <div class="md:w-1/2">
                        <DatePicker :showIcon="true" :showButtonBar="true" v-model="contractDate"
                            placeholder=" Дата контракта"></DatePicker>
                    </div>
                    <div class="md:w-1/2">
                        <DatePicker :showIcon="true" :showButtonBar="true" v-model="contractStart"
                            placeholder="Дата начала работы"></DatePicker>
                    </div>

                </div>
                <div class="flex space-x-2">
                    <div class="md:w-1/2">
                        <InputText id="fullname-latin" type="text" placeholder="Ф.И.О. на латинице" autocomplete="nope"
                            @input="handleLatinInput" />
                    </div>
                    <div class="md:w-1/2">
                        <InputText id="fullname-cyrillic" type="text" placeholder="Ф.И.О. на кириллице"
                            autocomplete="nope" @input="handleCyrillicInput" />
                    </div>
                </div>

                <div class="font-semibold text-xl">Паспортные данные</div>
                <div class="flex space-x-2">
                    <div class="md:w-1/5">
                        <InputText autocomplete="nope" id="passport-series" type="text" @input="handleLatinInput"
                            placeholder="Серия" class="border border-gray-300 rounded p-2" />
                    </div>
                    <div class="md:w-1/2">
                        <InputText id="passport-number" autocomplete="nope" type="text" placeholder="Номер паспорта"
                            class="border border-gray-300 rounded p-2" />
                    </div>
                    <div class="md:w-full">
                        <InputText id="passport-issued" type="text" placeholder="Кем выдан" autocomplete="nope"
                            class="border border-gray-300 rounded p-2" />
                    </div>

                </div>
                <div class="flex space-x-2">
                    <div class="md:w-1/2">
                        <DatePicker :showIcon="true" :showButtonBar="true" v-model="passportIssuedDate"
                            placeholder="Когда выдан"></DatePicker>
                    </div>
                    <div class="md:w-1/2">
                        <DatePicker :showIcon="true" :showButtonBar="true" v-model="passportExpireDate"
                            placeholder="Срок действие"></DatePicker>
                    </div>
                </div>

                <div class="flex space-x-2">
                    <div class="md:w-full">
                        <InputText id="address" type="text" placeholder="Адрес по прописке" autocomplete="nope">
                        </InputText>
                    </div>
                </div>

                <div class="flex space-x-2">
                    <div class="md:w-1/2">
                        <InputText id="inn" type="text" placeholder="ИНН" autocomplete="nope"></InputText>
                    </div>
                    <div class="md:w-1/2">
                        <InputText id="pinfl" type="text" placeholder="ПИНФЛ" autocomplete="nope"></InputText>
                    </div>
                    <div class="md:w-1/2">
                        <InputText id="inps" type="text" placeholder="ИНПС" autocomplete="nope"></InputText>
                    </div>
                </div>

                <div class="font-semibold text-xl">Задачи и функции</div>
                <div class="flex space-x-4">
                    <div class="md:w-1/2">
                        <label for="position">Должность</label>
                        <InputText id="position" type="text" />
                    </div>
                    <div class="md:w-1/2">
                        <label for="contract-type">Тип договора:</label>
                        <Select v-model="dropdownValue" :options="dropdownValues" optionLabel="name" placeholder="" />
                    </div>
                </div>

                <div class="flex space-x-4">
                    <div class="md:w-1/2">
                        <label for="supervision">Непосредственное подчинение</label>
                        <InputText id="supervision" type="text" />
                    </div>
                </div>

                <div class="font-semibold text-xl">Место работы</div>
                <div class="flex space-x-4">
                    <div class="md:w-1/2">
                        <label for="region">Регион: </label>
                        <InputText id="region" type="text" />
                    </div>
                    <div class="md:w-1/2">
                        <label for="enterprise-address">Адрес предприятия: </label>
                        <InputText id="enterprise-address" type="text" />
                    </div>
                </div>

                <div class="font-semibold text-xl">Оплата и сроки</div>
                <div class="flex space-x-4">
                    <div class="md:w-1/2">
                        <label for="salary">Базовая часть заработной платы (в цифрах и прописью): </label>
                        <InputText id="salary" type="text" />
                    </div>
                    <!-- <div class="md:w-1/2">
                        <label for="work-mode">Режим работы: </label>
                        <InputText id="work-mode" type="text" />
                    </div> -->
                    <!-- </div>

                <div class="flex space-x-4"> -->
                    <div class="md:w-1/2">
                        <label for="probation-period">Испытательный срок (если есть): </label>
                        <InputText id="probation-period" type="text" />
                    </div>
                </div>

                <div class="font-semibold text-xl">Режим работы</div>
                <div class="flex space-x-4">
                    <div class="md:w-1/4">
                        <label for="contract-type">С:</label>
                        <Select v-model="weekStart" :options="dropdownValues2" optionLabel="name" placeholder="" />
                    </div>
                    <div class="md:w-1/4">
                        <label for="contract-type">По:</label>
                        <Select v-model="weekEnd" :options="dropdownValues3" optionLabel="name" placeholder="" />
                    </div>
                    <div class="md:w-1/4">
                        <label for="contract-type">Начало рабочего дня:</label>
                        <Select v-model="workDayStarts" :options="clock" optionLabel="name" placeholder="" />
                    </div>
                    <div class="md:w-1/4">
                        <label for="contract-type">Конец рабочего дня:</label>
                        <Select v-model="workDayEnds" :options="clock" optionLabel="name" placeholder="" />
                    </div>
                </div>


                <div class="font-semibold text-xl">Контакты</div>
                <div class="flex space-x-4">
                    <div class="md:w-1/2">
                        <label for="phone">Телефон: </label>
                        <InputText id="phone" type="text" value="+998" />
                    </div>
                </div>

                <div class="flex justify-end mt-4">
                    <div class="card flex flex-col gap-4">
                        <div class="flex flex-wrap gap-2">
                            <Button label="Submit" @click="saveData">Сохранить</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Fluid>

</template>
