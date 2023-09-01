<script setup lang="ts">
  import { ref } from 'vue';
  import { libpit } from 'libmjolnir';

  defineProps({
    entry: {
      type: libpit.PitEntry,
      required: true
    }
  });

  const emit = defineEmits(['flash']);

  const currentFile = ref(undefined as File | undefined)

  function stageFile (event: any) {
    currentFile.value = event?.target?.files?.[0];
  }

  async function flashPartition (partitionName: string) {
    if (!currentFile.value) {
      return;
    }

    emit('flash', {
      name: partitionName,
      data: new Uint8Array(await currentFile.value.arrayBuffer())
    });
  }
</script>

<template>
  <p class="pit-entry">
    <div>partitionName: {{ entry.partitionName }}</div>
    <div>identifier: {{ entry.identifier }}</div>
    <div>flashFileName: {{ entry.flashFilename }}</div>
    <div>blockSizeOrOffset: {{ entry.blockSizeOrOffset }}</div>
    <template v-if="entry.isFlashable">
      <input type="file" :id="`flash-${entry.identifier}`" @change="stageFile"/>
      <button
        :disabled="!currentFile"
        @click="flashPartition(entry.partitionName)"
      >
        Flash partition
      </button>
    </template>
  </p>
</template>