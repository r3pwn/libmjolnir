<script setup lang="ts">
  import { ref } from 'vue';
  import libmjolnir, { OdinDevice, libpit } from 'libmjolnir';

  const hasDevice = ref(false);
  const pitEntries = ref([] as libpit.PitEntry[]);
  const connectedDevice = ref({} as OdinDevice);

  async function setupDevice (device: OdinDevice) {
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

  function beginSession () {
    connectedDevice.value.beginSession();
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
    <button @click="beginSession">Begin session</button>
    <button @click="rebootDevice">Reboot device</button>
    <button @click="requestDeviceType">Request device type</button>
    <button @click="receivePitFile">Print PIT file</button>

    <p v-if="pitEntries.length">
      <p v-for="entry in pitEntries">
        <div>partitionName: {{ entry.partitionName }}</div>
        <div>identifier: {{ entry.identifier }}</div>
        <div>flashFileName: {{ entry.flashFilename }}</div>
        <div>blockSizeOrOffset: {{ entry.blockSizeOrOffset }}</div>
        <div>----------------------------------------------</div>
      </p>
    </p>
  </p>
</template>

<style>
  @media (prefers-color-scheme: dark) {
    html {
      color-scheme: dark;
    }
  }
</style>