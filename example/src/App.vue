<script setup lang="ts">
  import libmjolnir, { SamsungDevice } from 'libmjolnir';
import { ref } from 'vue';

  const hasDevice = ref(false);
  const connectedDevice = ref({} as SamsungDevice);

  async function setupDevice (device: SamsungDevice) {
    connectedDevice.value = device;
    hasDevice.value = true;

    device.onDisconnect(() => {
      hasDevice.value = false;
      console.log('device was disconnected')
    });

    await device.initialize();
  }

  function requestDeviceAccess () {
    libmjolnir.requestDevice()
      .then(setupDevice);
  }

  function rebootDevice () {
    connectedDevice.value.reboot();
  }

  async function requestDeviceType () {
    await connectedDevice.value.requestDeviceType();
  }
</script>

<template>
  <button @click="requestDeviceAccess">Request device access</button>
  <template v-if="hasDevice">
    <button @click="rebootDevice">Reboot device</button>
    <button @click="requestDeviceType">Request device type</button>
  </template>
</template>