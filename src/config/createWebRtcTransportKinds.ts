import { types as mediasoupTypes } from "mediasoup";

interface TransportResult {
  transport: mediasoupTypes.WebRtcTransport;
  clientTransportParams: {
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    iceCandidates: mediasoupTypes.IceCandidate[];
    dtlsParameters: mediasoupTypes.DtlsParameters;
  };
}

const createWebRtcTransportBothKinds = (
  router: mediasoupTypes.Router
): Promise<TransportResult> =>
  new Promise(async (resolve, reject) => {
    try {
      const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: "127.0.0.1", announcedIp: undefined }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      const clientTransportParams = {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };

      resolve({ transport, clientTransportParams });
    } catch (error) {
      reject(error);
    }
  });

export default createWebRtcTransportBothKinds;
