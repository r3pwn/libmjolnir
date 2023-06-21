<script setup lang="ts">
  import libmjolnir from 'libmjolnir';

  function requestDeviceAccess() {
    libmjolnir.helpers.requestDevice()
      .then(async device =>  {
        console.log(device);
        await device.initialize();
        // await device.requestDeviceType();
        setTimeout(() => {
          device.reboot();
        }, 5000);
      })
  }
</script>

<template>
  <button @click="requestDeviceAccess">Request device access</button>
</template>