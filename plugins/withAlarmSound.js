const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SOUND_SOURCE = path.join(__dirname, '..', 'assets', 'sounds', 'alarm_sound.mp3');
const RAW_DIR_RELATIVE = ['app', 'src', 'main', 'res', 'raw'];

function withAlarmSound(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      if (!fs.existsSync(SOUND_SOURCE)) {
        throw new Error(
          `[withAlarmSound] Arquivo de som não encontrado em ${SOUND_SOURCE}. ` +
            'Adicione um wav/mp3 do alarme nesse caminho antes de rodar o prebuild.',
        );
      }
      const rawDir = path.join(modConfig.modRequest.platformProjectRoot, ...RAW_DIR_RELATIVE);
      fs.mkdirSync(rawDir, { recursive: true });
      fs.copyFileSync(SOUND_SOURCE, path.join(rawDir, 'alarm_sound.mp3'));
      return modConfig;
    },
  ]);
}

module.exports = withAlarmSound;
