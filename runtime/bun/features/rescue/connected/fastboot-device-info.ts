import { FastbootClient } from 'fastboot-bun-ts/fastboot';
import { listFastbootDevices } from 'fastboot-bun-ts/usb';
import type { DeviceInfo } from '../../../../../core/domain/device/info.ts';

function cleanVar(value: string | undefined) {
  const trimmed = (value || '').trim();
  return trimmed.toLowerCase() === 'unknown' ? '' : trimmed;
}

/**
 * Reads identifying info from a device sitting in Fastboot, for when ADB is not
 * available. Returns null when no Fastboot device is attached or nothing usable
 * (IMEI or serial) could be read.
 */
export async function readFastbootDeviceInfo(): Promise<DeviceInfo | null> {
  let devices: Awaited<ReturnType<typeof listFastbootDevices>>;
  try {
    devices = await listFastbootDevices();
  } catch {
    return null;
  }
  const target = devices?.[0];
  if (!target) {
    return null;
  }

  let client: FastbootClient | null = null;
  try {
    client = await FastbootClient.connect({
      serial: target.serialNumber || undefined,
      confirmPrivilegedFix: async () => true,
    });
    const active = client;
    const readVar = async (name: string) => {
      try {
        return cleanVar(await active.getVar(name));
      } catch {
        return '';
      }
    };

    const imei = await readVar('imei');
    const sn = (await readVar('serialno')) || cleanVar(target.serialNumber ?? undefined);
    if (!imei && !sn) {
      return null;
    }
    const product = await readVar('product');
    const sku = await readVar('sku');
    const carrier = await readVar('ro.carrier');

    return {
      imei,
      modelName: product || 'Motorola Device',
      modelCode: sku || product,
      sn,
      roCarrier: carrier || 'reteu',
    };
  } catch {
    return null;
  } finally {
    await client?.close().catch(() => {});
  }
}
