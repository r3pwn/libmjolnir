<script setup lang="ts">
  import libmjolnir, { SamsungDevice } from 'libmjolnir';
import { ref } from 'vue';

  const hasDevice = ref(false);
  const connectedDevice = ref({} as SamsungDevice);

  function requestDeviceAccess() {
    libmjolnir.helpers.requestDevice()
      .then(async device =>  {
        connectedDevice.value = device;
        hasDevice.value = true;

        await device.initialize();
      })
  }

  function rebootDevice() {
    connectedDevice.value.reboot();
  }
</script>

<template>
  <button @click="requestDeviceAccess">Request device access</button>
  <template v-if="hasDevice">
    <button @click="rebootDevice">Reboot device</button>
  </template>
</template>