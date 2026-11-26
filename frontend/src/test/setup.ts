import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom doesn't implement modal dialogs.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

afterEach(cleanup);
