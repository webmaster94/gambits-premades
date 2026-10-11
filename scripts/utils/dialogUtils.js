import { catDialog } from './catDialog.js';
export async function showDialog({ title, message, image, buttons = [] }) {
    return await catDialog.wait({
      window: { title },
      content: `
        <div class="gps-dialog-container">
          <div class="gps-dialog-section">
            <div class="gps-dialog-content">
              <div>
                <div class="gps-dialog-flex">
                  <p class="gps-dialog-paragraph">${message}</p>
                  <div id="image-container" class="gps-dialog-image-container">
                    ${image ? `<img src="${image}" class="gps-dialog-image">` : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      buttons: buttons.map((btn) => ({
        ...btn,
        callback: async () => {
          if (btn.callback) {
            await btn.callback();
          }

          return btn.action || btn.label;
        },
      })),
      close: () => null,
      rejectClose: false,
    });

}
