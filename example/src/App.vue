<script setup lang="ts">
  import { ref } from 'vue';
  import libmjolnir, { OdinDevice, libpit } from 'libmjolnir';
  import { version as libmjolnirVersion } from 'libmjolnir/package.json';

  import PartitionEntry from './components/PartitionEntry.vue';

  const hasDevice = ref(false);
  const devicePit = ref(undefined as libpit.PitData | undefined);
  const connectedDevice = ref({} as OdinDevice);

  const verboseLogging = ref(true);
  const defaultTimeout = ref(15000);
  const resetOnInit = ref(false);


  async function setupDevice (device: OdinDevice) {
    console.log(device.usbDevice);
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
    await device.endSession();
  }

  function requestDeviceAccess () {
    libmjolnir.requestDevice({
      logging: verboseLogging.value,
      timeout: defaultTimeout.value,
      resetOnInit: resetOnInit.value
    })
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
  <div>libmjolnir version: {{ libmjolnirVersion }}</div>
  <fieldset class="connection-options">
    <legend>Connection options</legend>
    <div>
      <label>Verbose logging: </label>
      <input type="checkbox" v-model="verboseLogging" />
    </div>
    <div>
      <label>Packet timeout: </label>
      <input type="number" v-model="defaultTimeout" />
    </div>
    <div>
      <label>Reset on initialize: </label>
      <input type="checkbox" v-model="resetOnInit" />
    </div>
  </fieldset>
  <button @click="requestDeviceAccess">Request device access</button>
  <p v-if="hasDevice">
    <p v-if="devicePit?.entries?.length">
      <div>board type: {{ devicePit.boardType }}</div>
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

  .connection-options {
    display: flex;
    flex-direction: column;
    width: fit-content;
    margin-bottom: 1rem;
  }
</style>