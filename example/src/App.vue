<script setup lang="ts">
  import libmjolnir, { SamsungDevice, libpit } from 'libmjolnir';
import { ref } from 'vue';

  const hasDevice = ref(false);
  const pitEntries = ref([] as libpit.PitEntry[]);
  const connectedDevice = ref({} as SamsungDevice);

  async function setupDevice (device: SamsungDevice) {
    await device.initialize();

    connectedDevice.value = device;
    hasDevice.value = true;

    device.onDisconnect(() => {
      hasDevice.value = false;
      pitEntries.value = [];
      console.log('device was disconnected')
    });
  }

  function requestDeviceAccess () {
    libmjolnir.requestDevice({ logging: true })
      .then(setupDevice);
  }

  function rebootDevice () {
    connectedDevice.value.reboot();
  }

  async function requestDeviceType () {
    await connectedDevice.value.requestDeviceType();
  }

  async function receivePitFile () {
    await connectedDevice.value.getPitData().then(pitData => {
      pitEntries.value = pitData.entries;
    });
  }
</script>

<template>
  <button @click="requestDeviceAccess">Request device access</button>
  <p v-if="hasDevice">
    <button @click="rebootDevice">Reboot device</button>
    <button @click="requestDeviceType">Request device type</button>
    <button @click="receivePitFile">Print PIT file</button>

    <p v-if="pitEntries.length">
      <p v-for="entry in pitEntries">
        <div>partitionName: {{ entry.partitionName }}</div><br/>
        <div>flashFileName: {{ entry.flashFilename }}</div><br/>
        <div>blockSizeOrOffset: {{ entry.blockSizeOrOffset }}</div><br/>
        <div>----------------------------------------------</div>
      </p>
    </p>
  </p>
</template>