const video = document.getElementById('scanner');
     const canvas = document.getElementById('scannerCanvas');
     const scanResult = document.getElementById('scanResult');

     function startScanner() {
       navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
         .then((stream) => {
           video.srcObject = stream;
           video.play();
           requestAnimationFrame(scanQRCode);
         })
         .catch((err) => {
           console.error("Erro ao acessar a câmera: ", err);
         });
     }

     function scanQRCode() {
       if (video.readyState === video.HAVE_ENOUGH_DATA) {
         canvas.height = video.videoHeight;
         canvas.width = video.videoWidth;
         const context = canvas.getContext('2d');
         context.drawImage(video, 0, 0, canvas.width, canvas.height);
         const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
         const code = jsQR(imageData.data, imageData.width, imageData.height, {
           inversionAttempts: "dontInvert",
         });

         if (code) {
           scanResult.textContent = `Link escaneado: ${code.data}`;
           updateScanMetadata(code.data);
         }
       }
       requestAnimationFrame(scanQRCode);
     }

     function updateScanMetadata(url) {
       const dbRef = firebase.database().ref('files');
       dbRef.orderByChild('url').equalTo(url).once('value', (snapshot) => {
         snapshot.forEach((childSnapshot) => {
           const key = childSnapshot.key;
           const scanCount = childSnapshot.val().scanCount || 0;
           dbRef.child(key).update({ scanCount: scanCount + 1 });
         });
       });
     }

     // Alternar entre as abas
     document.getElementById('uploadTab').addEventListener('click', () => {
       document.getElementById('uploadSection').classList.add('active');
       document.getElementById('scanSection').classList.remove('active');
     });

     document.getElementById('scanTab').addEventListener('click', () => {
       document.getElementById('scanSection').classList.add('active');
       document.getElementById('uploadSection').classList.remove('active');
       startScanner();
     });