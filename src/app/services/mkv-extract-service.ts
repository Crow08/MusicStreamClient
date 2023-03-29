import { Injectable } from '@angular/core';
import * as ebml from 'ebml';

const fileReaderStream = require('filereader-stream');
@Injectable({
  providedIn: 'root',
})
export class MkvExtractService {
  mkvExtract(file: File, callback: (error: any, files?: { name?: string; data?: any }[]) => void) {
    const fileStream = fileReaderStream(file, {
      chunkSize: 2 * 1024 * 1024,
    });
    this.handleStream(fileStream, callback);
  }

  handleStream(stream: any, callback: (error: any, files?: { name?: string; data?: any }[]) => void) {
    const decoder = new ebml.Decoder();
    const tracks: number[] = [];
    const trackData: any[][] = [];
    const files: {
      name?: string;
      data?: any;
    }[] = [];
    let currentFile = 0;
    let currentTimecode: number;
    let trackIndexTemp: number;
    let trackTypeTemp: number;
    let trackDataTemp: string;
    let trackIndex: number;

    decoder.on('error', (error) => {
      callback(error);
      stream.destroy();
    });

    decoder.on('data', (chunk) => {
      switch (chunk[0]) {
        case 'end':
          // if (chunk[1].name === 'Info') {
          //   stream.destroy()
          // }
          if (chunk[1].name === 'TrackEntry') {
            if (trackTypeTemp === 0x11) {
              tracks.push(trackIndexTemp);
              trackData.push([trackDataTemp]);
            }
          }
          break;
        case 'tag':
          if (chunk[1].name === 'FileName') {
            if (!files[currentFile]) {
              files[currentFile] = {};
            }
            files[currentFile].name = chunk[1].data.toString();
          }
          if (chunk[1].name === 'FileData') {
            if (!files[currentFile]) {
              files[currentFile] = {};
            }
            files[currentFile].data = chunk[1].data;
          }
          if (chunk[1].name === 'TrackNumber') {
            trackIndexTemp = chunk[1].data[0];
          }
          if (chunk[1].name === 'TrackType') {
            trackTypeTemp = chunk[1].data[0];
          }
          if (chunk[1].name === 'CodecPrivate') {
            trackDataTemp = chunk[1].data.toString();
          }
          if (chunk[1].name === 'SimpleBlock' || chunk[1].name === 'Block') {
            const trackLength = ebml.tools.readVint(chunk[1].data);
            trackIndex = tracks.indexOf(trackLength.value);
            if (trackIndex !== -1) {
              const timestampArray = new Uint8Array(chunk[1].data).slice(trackLength.length, trackLength.length + 2);
              const timestamp = new DataView(timestampArray.buffer).getInt16(0);
              const lineData = chunk[1].data.slice(trackLength.length + 3);
              trackData[trackIndex].push(lineData.toString(), timestamp, currentTimecode);
            }
          }
          if (chunk[1].name === 'Timecode') {
            currentTimecode = this.readUnsignedInteger(this.padZeroes(chunk[1].data));
          }
          if (chunk[1].name === 'BlockDuration' && trackIndex !== -1) {
            // the duration is in milliseconds
            const duration = this.readUnsignedInteger(this.padZeroes(chunk[1].data));
            trackData[trackIndex].push(duration);
          }
          break;
      }
      if (files[currentFile] && files[currentFile].name && files[currentFile].data) {
        currentFile++;
      }
    });

    stream.on('end', () => {
      trackData.forEach((entries, index) => {
        const heading = entries[0];
        const isASS = heading.includes('Format:');
        const formatFn = isASS ? this.formatTimestamp : this.formatTimestampSRT;
        const eventMatches = isASS ? heading.match(/\[Events\]\s+Format:([^\r\n]*)/) : [''];
        const headingParts = isASS ? heading.split(eventMatches[0]) : ['', ''];
        const fixedLines = [];
        for (let i = 1; i < entries.length; i += 4) {
          const line = entries[i];
          const lineTimestamp = entries[i + 1];
          const chunkTimestamp = entries[i + 2];
          const duration = entries[i + 3];
          const lineParts = isASS && line.split(',');
          const lineIndex = isASS ? lineParts[0] : (i - 1) / 4;
          const startTimestamp = formatFn(chunkTimestamp + lineTimestamp);
          const endTimestamp = formatFn(chunkTimestamp + lineTimestamp + duration);

          const fixedLine = isASS
            ? 'Dialogue: ' + [lineParts[1], startTimestamp, endTimestamp].concat(lineParts.slice(2)).join(',')
            : lineIndex +
              1 +
              '\r\n' +
              startTimestamp.replace('.', ',') +
              ' --> ' +
              endTimestamp.replace('.', ',') +
              '\r\n' +
              line +
              '\r\n';

          if (fixedLines[lineIndex]) {
            fixedLines[lineIndex] += '\r\n' + fixedLine;
          } else {
            fixedLines[lineIndex] = fixedLine;
          }
        }
        const data =
          (isASS ? headingParts[0] + eventMatches[0] + '\r\n' : '') + fixedLines.join('\r\n') + headingParts[1] + '\r\n';

        files.push({
          name: 'Subtitle_' + (index + 1) + (isASS ? '.ass' : '.srt'),
          data,
        });
      });

      if (files.length === 0) {
        callback(Error('No data found'));
        return;
      }

      callback(null, files);
    });

    stream.pipe(decoder);
  }

  padZeroes(arr: ArrayLike<number>) {
    const len = Math.ceil(arr.length / 2) * 2;
    const output = new Uint8Array(len);
    output.set(arr, len - arr.length);
    return output.buffer;
  }

  readUnsignedInteger(data: ArrayBufferLike) {
    const view = new DataView(data);
    return data.byteLength === 2 ? view.getUint16(0) : view.getUint32(0);
  }

  formatTimestamp(timestamp: number) {
    const seconds = timestamp / 1000;
    const hh = Math.floor(seconds / 3600);
    let mm = Math.floor((seconds - hh * 3600) / 60);
    let ss = seconds - hh * 3600 - mm * 60;

    return `${hh}:${mm < 10 ? `0${mm}` : mm}:${ss < 10 ? `0${ss.toFixed(2)}` : ss.toFixed(2)}`;
  }

  formatTimestampSRT(timestamp: number) {
    const seconds = timestamp / 1000;
    let hh = Math.floor(seconds / 3600);
    let mm = Math.floor((seconds - hh * 3600) / 60);
    let ss = seconds - hh * 3600 - mm * 60;

    return `${hh < 10 ? `0${hh}` : hh}:${mm < 10 ? `0${mm}` : mm}:${ss < 10 ? `0${ss.toFixed(3)}` : ss.toFixed(3)}`;
  }
}
