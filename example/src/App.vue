<script setup lang="ts">
  import { ref } from 'vue';
  import libmjolnir, { OdinDevice, libpit } from 'libmjolnir';
  import PartitionEntry from './components/PartitionEntry.vue';

  const hasDevice = ref(false);
  const devicePit = ref(undefined as libpit.PitData | undefined);
  const connectedDevice = ref({} as OdinDevice);

  async function setupDevice (device: OdinDevice) {
    await device.initialize();

    connectedDevice.value = device;
    hasDevice.value = true;

    device.onDisconnect(() => {
      hasDevice.value = false;
      devicePit.value = undefined;
      console.log('device was disconnected')
    });

    await device.beginSession();
    devicePit.value = await connectedDevice.value.getPitData();
  }

  function requestDeviceAccess () {
    libmjolnir.requestDevice({ logging: true, timeout: 15000 })
      .then(setupDevice);
  }

  function rebootDevice () {
    connectedDevice.value.reboot();
  }

  async function flashPartition (data: {name: string, data: Uint8Array}) {
    await connectedDevice.value.flashPartition(data.name, data.data);
  }
</script>

<template>
  <button @click="requestDeviceAccess">Request device access</button>
  <p v-if="hasDevice">
    <p v-if="devicePit?.entries?.length">
      <div>board type: {{ devicePit.pitName }}</div>
      <button @click="rebootDevice">Reboot device</button>
      <template v-for="(entry, index) in devicePit.entries">
        <partition-entry
          :entry="entry"
          @flash="flashPartition"
        />
        <hr v-if="index !== devicePit.entries.length - 1" />
      </template>
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