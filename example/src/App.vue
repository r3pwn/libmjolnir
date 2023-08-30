<script setup lang="ts">
  import { ref } from 'vue';
  import libmjolnir, { OdinDevice, libpit } from '../..';
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
  }

  function requestDeviceAccess () {
    libmjolnir.requestDevice({ logging: true, timeout: 15000 })
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
    await connectedDevice.value.getPitData().then((pitData) => {
      console.log(pitData);
      devicePit.value = pitData;
    });
  }

  async function flashPartition (data: {name: string, data: Uint8Array}) {
    await connectedDevice.value.flashPartition(data.name, data.data);
  }
</script>

<template>
  <button @click="requestDeviceAccess">Request device access</button>
  <p v-if="hasDevice">
    <button @click="beginSession">Begin session</button>
    <button @click="rebootDevice">Reboot device</button>
    <button @click="requestDeviceType">Request device type</button>
    <button @click="receivePitFile">Print PIT file</button>

    <p v-if="devicePit?.entries?.length">
      <div>board type: {{ devicePit.pitName }}</div>
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