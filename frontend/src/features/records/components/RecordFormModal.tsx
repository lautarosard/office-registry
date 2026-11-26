import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Field';
import { Modal, ModalActions } from '../../../shared/components/Modal';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { today } from '../../../shared/utils/format';
import { recordSchema, type RecordForm } from '../record.schema';
import { recordsApi } from '../records.api';
import type { RecordInput, RecordItem } from '../types';

const toInput = (form: RecordForm): RecordInput => ({
  ...form,
  forwarding: form.forwarding || null,
});

/** Upper-cases while typing without moving the cursor. */
function upperCaseInPlace(input: HTMLInputElement) {
  const { selectionStart, selectionEnd } = input;
  input.value = input.value.toUpperCase();
  input.setSelectionRange(selectionStart, selectionEnd);
}

interface RecordFormModalProps {
  /** Present when editing. */
  record?: RecordItem;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function RecordFormModal({
  record,
  onClose,
  onSaved,
}: RecordFormModalProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
  } = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      date: record?.date ?? today(),
      ex: record?.ex ?? '',
      ifCode: record?.ifCode ?? '',
      subject: record?.subject ?? '',
      department: record?.department ?? '',
      forwarding: record?.forwarding ?? '',
    },
  });

  const save = useMutation({
    mutationFn: (form: RecordForm) => {
      const input = toInput(form);
      if (!record) return recordsApi.create(input);

      // Send only what was edited, so fields someone else changed meanwhile
      // aren't overwritten with the old values.
      const changes = Object.fromEntries(
        Object.entries(input).filter(
          ([key]) => dirtyFields[key as keyof RecordForm],
        ),
      );
      return recordsApi.update(record.id, changes);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['records'] });
      onSaved(record ? 'Registro actualizado.' : 'Registro creado.');
    },
  });

  const gdeField = (name: 'ex' | 'ifCode') => {
    const field = register(name);
    return {
      ...field,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        upperCaseInPlace(event.target);
        return field.onChange(event);
      },
    };
  };

  return (
    <Modal title={record ? 'Editar registro' : 'Nuevo registro'} onClose={onClose}>
      <form
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={handleSubmit((form) => save.mutate(form))}
      >
        <Input
          type="date"
          label="Fecha"
          error={errors.date?.message}
          {...register('date')}
        />
        <div className="hidden sm:block" />
        <Input
          label="EX"
          autoComplete="off"
          spellCheck={false}
          placeholder="EX-2025-93504106- -APN-DIFP#PFA"
          error={errors.ex?.message}
          {...gdeField('ex')}
        />
        <Input
          label="IF"
          autoComplete="off"
          spellCheck={false}
          placeholder="IF-2025-93911988-APN-SOPDGA#PFA"
          error={errors.ifCode?.message}
          {...gdeField('ifCode')}
        />
        <div className="sm:col-span-2">
          <Input
            label="Motivo"
            error={errors.subject?.message}
            {...register('subject')}
          />
        </div>
        <Input
          label="Repartición"
          error={errors.department?.message}
          {...register('department')}
        />
        <Input
          label="Pase"
          hint="Opcional"
          error={errors.forwarding?.message}
          {...register('forwarding')}
        />

        <div className="sm:col-span-2">
          {record?.updatedBy && (
            <p className="text-xs text-gray-700">
              Última modificación por {record.updatedBy.fullName}.
            </p>
          )}
          {save.isError && (
            <p role="alert" className="text-sm text-red-700">
              {apiErrorMessage(save.error, 'No se pudo guardar el registro.')}
            </p>
          )}
          <ModalActions>
            <Button type="submit" variant="success" disabled={save.isPending}>
              {save.isPending ? 'Guardando…' : 'Confirmar'}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </ModalActions>
        </div>
      </form>
    </Modal>
  );
}
