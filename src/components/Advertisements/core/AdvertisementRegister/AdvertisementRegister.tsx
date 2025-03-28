/**
 * AdvertisementRegister Component
 *
 * This component handles the creation and editing of advertisements for an organization.
 * It provides a modal-based form to input advertisement details such as name, media, type,
 * start date, and end date. The component supports both "register" and "edit" modes.
 *
 * @component
 * @param {InterfaceAddOnRegisterProps} props - The properties for the component.
 * @param {string} [props.formStatus='register'] - Determines whether the form is in "register" or "edit" mode.
 * @param {string} [props.idEdit] - The ID of the advertisement being edited (used in "edit" mode).
 * @param {string} [props.nameEdit=''] - The name of the advertisement being edited.
 * @param {string} [props.typeEdit='BANNER'] - The type of the advertisement being edited.
 * @param {string} [props.advertisementMediaEdit=''] - The media file of the advertisement being edited.
 * @param {Date} [props.startDateEdit=new Date()] - The start date of the advertisement being edited.
 * @param {Date} [props.endDateEdit=new Date()] - The end date of the advertisement being edited.
 * @param {Function} props.setAfter - Callback to reset pagination or refetch data after mutation.
 *
 * @returns {JSX.Element} The AdvertisementRegister component.
 *
 * @remarks
 * - Uses `react-bootstrap` for modal and form components.
 * - Integrates with Apollo Client for GraphQL mutations and queries.
 * - Validates date ranges to ensure the end date is not earlier than the start date.
 * - Converts uploaded media files to Base64 format for preview and submission.
 *
 * @example
 * <AdvertisementRegister
 *   formStatus="register"
 *   setAfter={setAfterCallback}
 * />
 *
 * @example
 * <AdvertisementRegister
 *   formStatus="edit"
 *   idEdit="123"
 *   nameEdit="Sample Ad"
 *   typeEdit="POPUP"
 *   advertisementMediaEdit="base64string"
 *   startDateEdit={new Date()}
 *   endDateEdit={new Date()}
 *   setAfter={setAfterCallback}
 * />
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from 'style/app-fixed.module.css';
import { Button, Form, Modal } from 'react-bootstrap';
import {
  ADD_ADVERTISEMENT_MUTATION,
  UPDATE_ADVERTISEMENT_MUTATION,
} from 'GraphQl/Mutations/mutations';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import convertToBase64 from 'utils/convertToBase64';
import { ORGANIZATION_ADVERTISEMENT_LIST } from 'GraphQl/Queries/Queries';
import { useParams } from 'react-router-dom';
import type {
  InterfaceAddOnRegisterProps,
  InterfaceFormStateTypes,
} from 'types/Advertisement/interface';

function advertisementRegister({
  formStatus = 'register',
  idEdit,
  nameEdit = '',
  typeEdit = 'BANNER',
  advertisementMediaEdit = '',
  endDateEdit = new Date(),
  startDateEdit = new Date(),
  setAfter,
}: InterfaceAddOnRegisterProps): JSX.Element {
  const { t } = useTranslation('translation', { keyPrefix: 'advertisement' });
  const { t: tCommon } = useTranslation('common');
  const { t: tErrors } = useTranslation('errors');

  const { orgId: currentOrg } = useParams();

  const [show, setShow] = useState(false);
  const handleClose = (): void => setShow(false); // Closes the modal
  const handleShow = (): void => setShow(true); // Shows the modal

  const [create] = useMutation(ADD_ADVERTISEMENT_MUTATION, {
    refetchQueries: [
      {
        query: ORGANIZATION_ADVERTISEMENT_LIST,
        variables: { first: 6, after: null, id: currentOrg },
      },
    ],
  });

  const [updateAdvertisement] = useMutation(UPDATE_ADVERTISEMENT_MUTATION, {
    refetchQueries: [
      {
        query: ORGANIZATION_ADVERTISEMENT_LIST,
        variables: { first: 6, after: null, id: currentOrg },
      },
    ],
  });

  // Initialize form state
  const [formState, setFormState] = useState<InterfaceFormStateTypes>({
    name: '',
    advertisementMedia: '',
    type: 'BANNER',
    startDate: new Date(),
    endDate: new Date(),
    organizationId: currentOrg,
  });

  // Set form state if editing
  useEffect(() => {
    if (formStatus === 'edit') {
      setFormState((prevState) => ({
        ...prevState,
        name: nameEdit || '',
        advertisementMedia: advertisementMediaEdit || '',
        type: typeEdit || 'BANNER',
        startDate: startDateEdit || new Date(),
        endDate: endDateEdit || new Date(),
        orgId: currentOrg,
      }));
    }
  }, [
    formStatus,
    nameEdit,
    advertisementMediaEdit,
    typeEdit,
    startDateEdit,
    endDateEdit,
    currentOrg,
  ]);
  /**
   * Handles advertisement registration.
   * Validates the date range and performs the mutation to create an advertisement.
   */
  const handleRegister = async (): Promise<void> => {
    try {
      console.log('At handle register', formState);
      if (formState.endDate < formState.startDate) {
        toast.error(t('endDateGreaterOrEqual') as string);
        return;
      }
      const { data } = await create({
        variables: {
          organizationId: currentOrg,
          name: formState.name as string,
          type: formState.type as string,
          startDate: dayjs(formState.startDate).format('YYYY-MM-DD'),
          endDate: dayjs(formState.endDate).format('YYYY-MM-DD'),
          file: formState.advertisementMedia as string,
        },
      });

      if (data) {
        toast.success(t('advertisementCreated') as string);
        setFormState({
          name: '',
          advertisementMedia: '',
          type: 'BANNER',
          startDate: new Date(),
          endDate: new Date(),
          organizationId: currentOrg,
        });
      }
      setAfter(null);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(
          tErrors('errorOccurredCouldntCreate', {
            entity: 'advertisement',
          }) as string,
        );
        console.log('error occured', error.message);
      }
    }
  };

  /**
   * Handles advertisement update.
   * Validates the date range and performs the mutation to update the advertisement.
   */
  const handleUpdate = async (): Promise<void> => {
    try {
      const updatedFields: Partial<InterfaceFormStateTypes> = {};

      // Only include the fields which are updated
      if (formState.name !== nameEdit) {
        updatedFields.name = formState.name;
      }
      if (formState.advertisementMedia !== advertisementMediaEdit) {
        updatedFields.advertisementMedia = formState.advertisementMedia;
      }
      if (formState.type !== typeEdit) {
        updatedFields.type = formState.type;
      }
      if (formState.endDate < formState.startDate) {
        toast.error(t('endDateGreaterOrEqual') as string);
        return;
      }
      const startDateFormattedString = dayjs(formState.startDate).format(
        'YYYY-MM-DD',
      );
      const endDateFormattedString = dayjs(formState.endDate).format(
        'YYYY-MM-DD',
      );

      const startDateDate = dayjs(
        startDateFormattedString,
        'YYYY-MM-DD',
      ).toDate();
      const endDateDate = dayjs(endDateFormattedString, 'YYYY-MM-DD').toDate();

      if (!dayjs(startDateDate).isSame(startDateEdit, 'day')) {
        updatedFields.startDate = startDateDate;
      }
      if (!dayjs(endDateDate).isSame(endDateEdit, 'day')) {
        updatedFields.endDate = endDateDate;
      }

      console.log('At handle update', updatedFields);
      const { data } = await updateAdvertisement({
        variables: {
          id: idEdit,
          ...(updatedFields.name && { name: updatedFields.name }),
          ...(updatedFields.advertisementMedia && {
            file: updatedFields.advertisementMedia,
          }),
          ...(updatedFields.type && { type: updatedFields.type }),
          ...(updatedFields.startDate && {
            startDate: startDateFormattedString,
          }),
          ...(updatedFields.endDate && { endDate: endDateFormattedString }),
        },
      });

      if (data) {
        toast.success(
          tCommon('updatedSuccessfully', { item: 'Advertisement' }) as string,
        );
        handleClose();
        setAfter(null);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };
  return (
    //If register show register button else show edit button
    <>
      {formStatus === 'register' ? (
        <Button
          className={styles.dropdown}
          variant="primary"
          onClick={handleShow}
          data-testid="createAdvertisement"
        >
          <i className="fa fa-plus"></i>
          {t('createAdvertisement')}
        </Button>
      ) : (
        <div onClick={handleShow} data-testid="editBtn">
          {tCommon('edit')}
        </div>
      )}
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          {formStatus === 'register' ? (
            <Modal.Title> {t('addNew')}</Modal.Title>
          ) : (
            <Modal.Title>{t('editAdvertisement')}</Modal.Title>
          )}
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="registerForm.Rname">
              <Form.Label>{t('Rname')}</Form.Label>
              <Form.Control
                type="text"
                placeholder={t('EXname')}
                autoComplete="off"
                required
                value={formState.name}
                onChange={(e): void => {
                  setFormState({
                    ...formState,
                    name: e.target.value,
                  });
                }}
                className={styles.inputField}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="advertisementMedia">
                {t('Rmedia')}
              </Form.Label>
              <Form.Control
                accept="image/*, video/*"
                data-testid="advertisementMedia"
                name="advertisementMedia"
                type="file"
                id="advertisementMedia"
                multiple={false}
                onChange={async (
                  e: React.ChangeEvent<HTMLInputElement>,
                ): Promise<void> => {
                  const target = e.target as HTMLInputElement;
                  const file = target.files && target.files[0];
                  if (file) {
                    const mediaBase64 = await convertToBase64(file);
                    setFormState({
                      ...formState,
                      advertisementMedia: mediaBase64,
                    });
                  }
                }}
                className={styles.inputField}
              />
              {formState.advertisementMedia && (
                <div
                  className={styles.previewAdvertisementRegister}
                  data-testid="mediaPreview"
                >
                  {formState.advertisementMedia.includes('video') ? (
                    <video
                      muted
                      autoPlay={true}
                      loop={true}
                      playsInline
                      crossOrigin="anonymous"
                    >
                      <source
                        src={formState.advertisementMedia}
                        type="video/mp4"
                      />
                    </video>
                  ) : (
                    <img src={formState.advertisementMedia} />
                  )}
                  <button
                    className={styles.closeButtonAdvertisementRegister}
                    onClick={(e): void => {
                      e.preventDefault();
                      setFormState({
                        ...formState,
                        advertisementMedia: '',
                      });
                      const fileInput = document.getElementById(
                        'advertisementMedia',
                      ) as HTMLInputElement;
                      if (fileInput) {
                        fileInput.value = '';
                      }
                    }}
                    data-testid="closePreview"
                  >
                    <i className="fa fa-times"></i>
                  </button>
                </div>
              )}
            </Form.Group>
            <Form.Group className="mb-3" controlId="registerForm.Rtype">
              <Form.Label>{t('Rtype')}</Form.Label>
              <Form.Select
                aria-label={t('Rtype')}
                value={formState.type}
                onChange={(e): void => {
                  setFormState({
                    ...formState,
                    type: e.target.value,
                  });
                }}
                className={styles.inputField}
              >
                <option value="POPUP">Popup Ad</option>
                <option value="BANNER">Banner Ad </option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="registerForm.RstartDate">
              <Form.Label>{t('RstartDate')}</Form.Label>
              <Form.Control
                type="date"
                required
                value={formState.startDate.toISOString().slice(0, 10)}
                onChange={(e): void => {
                  setFormState({
                    ...formState,
                    startDate: new Date(e.target.value),
                  });
                }}
                className={styles.inputField}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="registerForm.RDate">
              <Form.Label>{t('RendDate')}</Form.Label>
              <Form.Control
                type="date"
                required
                value={formState.endDate.toISOString().slice(0, 10)}
                onChange={(e): void => {
                  setFormState({
                    ...formState,
                    endDate: new Date(e.target.value),
                  });
                }}
                className={styles.inputField}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleClose}
            className={`btn btn-danger ${styles.removeButton}`}
            data-testid="addonclose"
          >
            {tCommon('close')}
          </Button>
          {formStatus === 'register' ? (
            <Button
              onClick={handleRegister}
              data-testid="addonregister"
              className={styles.addButton}
            >
              {tCommon('register')}
            </Button>
          ) : (
            <Button
              onClick={handleUpdate}
              data-testid="addonupdate"
              className={styles.addButton}
            >
              {tCommon('saveChanges')}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}

advertisementRegister.propTypes = {
  name: PropTypes.string,
  advertisementMedia: PropTypes.string,
  type: PropTypes.string,
  startDate: PropTypes.instanceOf(Date),
  endDate: PropTypes.instanceOf(Date),
  organizationId: PropTypes.string,
  formStatus: PropTypes.string,
};

export default advertisementRegister;
