import React, { useEffect, useState } from "react";
import {
  CCard,
  CCardBody,
  CCol,
  CCardHeader,
  CRow,
  CButton,
  CModal,
  CModalHeader,
  CModalBody,
  CModalTitle,
  CModalFooter,
  CFormLabel,
  CForm,
  CFormInput,
  CFormTextarea
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowThickToBottom, cilArrowThickFromBottom } from "@coreui/icons";
import { Table, Pagination, TagPicker, SelectPicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import { confirmAlert } from "react-confirm-alert"; // Import
import "react-confirm-alert/src/react-confirm-alert.css"; // Import css
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import { MajorAPI } from "../../api/major";
import * as API from "../../api";
import { CLIENT_MAJOR_ASSIGN_SUBJECT } from "../../api";

const rowKey = "id";
const ExpandCell = ({ rowData, dataKey, expandedRowKeys, onChange, ...props }) => (
  <Table.Cell {...props}>
    <CIcon
      icon={
        expandedRowKeys.some((key) => key === rowData[rowKey]) ? cilArrowThickFromBottom : cilArrowThickToBottom
      }
      size="sm"
      appearance="subtle"
      onClick={() => {
        onChange(rowData);
      }}
    />
  </Table.Cell>
);

const renderRowExpanded = (rowData) => {
  const subjectParser = rowData.subjects.map((e) => (
    `Subject: ${e.subject_name} (${e.subject_code}).\n`)
  );
  const subjects = subjectParser.toString().replaceAll(",", "");
  return (
    <CFormTextarea rows={4} defaultValue={subjects} readOnly />
  );
};

const ListOrganization = () => {
  // Common & table states
  const [loadingTable, setLoadingTable] = React.useState(false);
  const [perpage, setPerpage] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = useState(null);
  const [payloadTable, setPayloadTable] = useState([]);
  const [payloadSubjects, setPayloadSubject] = useState([]);
  const [majorIdPickerSelected, setMajorIdPickerSelected] = useState(null);
  const [valueSubjectPicker, setValueSubjectsPicker] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = React.useState([]);

  // BETA SORT
  const [sortColumn, setSortColumn] = React.useState();
  const [sortType, setSortType] = React.useState();

  // Modal states
  const [visibleModal, setVisibleModal] = useState(false);

  // Create & update modal states
  const [payloadModal, setPayloadModal] = useState({
    major_id: 0,
    major_name: "",
    major_code: ""
  });

  const history = useHistory();

  const ActionCell = ({ rowData, dataKey, onChange, ...props }) => {
    return (
      <Table.Cell {...props} style={{ padding: "6px" }}>
        <CButton
          appearance="link"
          onClick={() => {
            handleEdit(rowData);
          }}>
          Edit
        </CButton>
        <CButton
          color="danger"
          style={{ marginLeft: "2px" }}
          onClick={() => {
            deleteRowConfirm(rowData);
          }}>
          Delete
        </CButton>
      </Table.Cell>
    );
  };

  const deleteRowConfirm = (rowData) => {
    confirmAlert({
      title: "Are you sure?",
      message: "Do you want to delete this row?",
      buttons: [
        {
          label: "Yes",
          onClick: () => {
            fetchDeletePayloadAPI({ major_id: rowData.id });
          }
        },
        {
          label: "No"
        }
      ]
    });
  };

  const onChangeSelectMajor = (e) => {
    setValueSubjectsPicker([]);
    setMajorIdPickerSelected(e);
    const selectedMajorId = e;
    let subjectsAlreadyExistInMajor = [];
    for (let i = 0; i < payloadTable.length; i++) {
      if (payloadTable[i].id === selectedMajorId) {
        payloadTable[i].subjects.forEach(function(item, index) {
          subjectsAlreadyExistInMajor.push(item.id);
        });
      }
    }
    setValueSubjectsPicker(subjectsAlreadyExistInMajor);
  };

  const onChangePage = page => {
    setPage(page);
    fetchTableAPI(page, perpage);
  };

  const onCloseModal = () => {
    setPayloadModal({
      major_id: "",
      major_name: "",
      major_code: ""
    });
    setVisibleModal(false);
  }

  const handleChangePerpage = dataKey => {
    setPerpage(dataKey);
    fetchTableAPI(page, dataKey);
  };

  const handleEdit = rowData => {
    setPayloadModal({
      major_id: rowData.id,
      major_name: rowData.major_name,
      major_code: rowData.major_code
    });
    setVisibleModal(!visibleModal);
  };

  const handleExpanded = (rowData, dataKey) => {
    let open = false;
    const nextExpandedRowKeys = [];

    expandedRowKeys.forEach((key) => {
      if (key === rowData[rowKey]) {
        open = true;
      } else {
        nextExpandedRowKeys.push(key);
      }
    });
    if (!open) {
      nextExpandedRowKeys.push(rowData[rowKey]);
    }
    setExpandedRowKeys(nextExpandedRowKeys);
  };

  const handleChangeTextModal = (e) => {
    const value = e.target.value;
    setPayloadModal({
      ...payloadModal,
      [e.target.name]: value
    });
  };

  const handleSaveSubjects = () => {
    if (majorIdPickerSelected === null) return toast.warning("You must select major");
    const data = {
      major_id: majorIdPickerSelected,
      subjects: valueSubjectPicker == null ? [] : valueSubjectPicker
    };
    fetchAssignSubjects(data);
  };

  const validateNewPayloadAPI = (isUpdate = false) => {
    if (isUpdate)
      return payloadModal.major_code.length > 0 && payloadModal.major_name.length > 0 && parseInt(payloadModal.major_id) > 0;
    return payloadModal.major_code.length > 0 && payloadModal.major_name.length > 0;
  };

  const fetchTableAPI = (page, perpage) => {
    setLoadingTable(true);
    MajorAPI("GET", API.CLIENT_MAJOR_MANAGEMENT, {}, page, perpage)
      .then(payload => {
        setLoadingTable(false);
        setPayloadTable(payload.majors.data);
        setPagination(payload.majors);
      })
      .catch(error => {
        setLoadingTable(false);
        console.log("Error in here");
        console.log(error);
        switch (error.status) {
          case 401:
            history.push("/login");
            break;
          case 403:
            history.push("/dashboard");
            toast.error(error.data.message);
            break;
          default:
            toast.error(error.data.message);
            break;
        }
      });
  };

  const fetchNewOrUpdatePayloadAPI = () => {
    let method;
    let isPassedValidate = false;

    if (parseInt(payloadModal.major_id) > 0) {
      method = "PATCH";
      isPassedValidate = validateNewPayloadAPI(true);
    } else {
      isPassedValidate = validateNewPayloadAPI();
      method = "POST";
    }

    if (!isPassedValidate) {
      return toast.warning("You must fill in the form.");
    }

    toast.promise(
      MajorAPI(method, API.CLIENT_MAJOR_MANAGEMENT, payloadModal),
      {
        pending: "Please waiting...",
        success: {
          render({ data }) {
            fetchTableAPI();
            return data.message;
          }
        },
        error: {
          render({ data }) {
            console.log("ERROR IN FETCH NEW PAYLOAD API");
            console.log(data);
            return data.data.message;
          }
        }
      }
    );
    setVisibleModal(!visibleModal);
  };

  const fetchDeletePayloadAPI = (data) => {
    toast.promise(
      MajorAPI("DELETE", API.CLIENT_MAJOR_MANAGEMENT, data),
      {
        pending: "Please waiting...",
        success: {
          render({ data }) {
            fetchTableAPI();
            return data.message;
          }
        },
        error: {
          render({ data }) {
            console.log("ERROR IN FETCH NEW PAYLOAD API");
            console.log(data);
            return data.data.message;
          }
        }
      }
    );
  };

  const fetchAllSubject = (page = 1, perpage = 100000000) => {
    MajorAPI("GET", API.CLIENT_SUBJECT_MANAGEMENT, {}, page, perpage)
      .then(payload => {
        setPayloadSubject(payload.subjects.data);
      })
      .catch(error => {
        if (typeof error === "undefined")
          console.log(error);
        switch (error.status) {
          default:
            toast.error(error.data.message);
            break;
        }
      });
  };

  const fetchAssignSubjects = (data) => {
    toast.promise(
      MajorAPI("POST", API.CLIENT_MAJOR_ASSIGN_SUBJECT, data),
      {
        pending: "Please waiting...",
        success: {
          render({ data }) {
            fetchTableAPI();
            return data.message;
          }
        },
        error: {
          render({ data }) {
            console.log("ERROR IN FETCH NEW PAYLOAD API");
            console.log(data);
            return data.data.message;
          }
        }
      }
    );
  };


  useEffect(() => {
    fetchTableAPI(page, perpage);
    fetchAllSubject();
  }, []);

  return (
    <CRow>
      <CModal alignment="center" visible={visibleModal} onClose={onCloseModal}>
        <CModalHeader>
          <CModalTitle>Major Form</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <div className="mb-3">
              <CFormLabel>Major name</CFormLabel>
              <CFormInput
                value={payloadModal.major_name}
                onChange={handleChangeTextModal}
                type="text"
                name="major_name"
                placeholder="Major" />
            </div>
            <div className="mb-3">
              <CFormLabel>Major Code</CFormLabel>
              <CFormInput
                value={payloadModal.major_code}
                onChange={handleChangeTextModal}
                type="text"
                name="major_code"
                placeholder="Major code" />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={onCloseModal}>
            Close
          </CButton>
          <CButton
            onClick={() => fetchNewOrUpdatePayloadAPI()}
            color="primary">Save changes</CButton>
        </CModalFooter>
      </CModal>
      <CCol xs={7}>
        <CCard className="mb-4">
          <div className="p-3 d-flex flex-row">
            <CButton
              onClick={() => setVisibleModal(!visibleModal)}
              color="success">New</CButton>
          </div>
          <CCardHeader>List Major</CCardHeader>
          <CCardBody>
            <Table
              virtualized
              loading={loadingTable}
              height={400}
              autoHeight={true}
              data={payloadTable}
              rowKey={rowKey}
              expandedRowKeys={expandedRowKeys}
              renderRowExpanded={renderRowExpanded}
              rowExpandedHeight={150}
            >
              <Table.Column width={70} align="center">
                <Table.HeaderCell>#</Table.HeaderCell>
                <ExpandCell dataKey="id" expandedRowKeys={expandedRowKeys} onChange={handleExpanded} />
              </Table.Column>
              <Table.Column width={50} align="center">
                <Table.HeaderCell>ID</Table.HeaderCell>
                <Table.Cell dataKey="id" />
              </Table.Column>
              <Table.Column width={200}>
                <Table.HeaderCell>Major</Table.HeaderCell>
                <Table.Cell dataKey="major_name" />
              </Table.Column>
              <Table.Column width={200}>
                <Table.HeaderCell>Major Code</Table.HeaderCell>
                <Table.Cell dataKey="major_code" />
              </Table.Column>
              <Table.Column width={200}>
                <Table.HeaderCell>Action</Table.HeaderCell>
                <ActionCell dataKey="id" />
              </Table.Column>
            </Table>
            <div style={{ padding: 20 }}>
              {pagination != null ? (<Pagination
                prev
                next
                first
                last
                ellipsis
                boundaryLinks
                maxButtons={5}
                size="xs"
                layout={["total", "-", "limit", "|", "pager", "skip"]}
                total={pagination.total}
                limitOptions={[1, 10, 25, 50, 100]}
                limit={perpage}
                activePage={pagination.current_page}
                onChangePage={onChangePage}
                onChangeLimit={handleChangePerpage}
              />) : null}

            </div>
          </CCardBody>
        </CCard>
      </CCol>
      {/*
      * Assign Subjects
      */}
      <CCol xs={5}>
        <CCard className="mb-4">
          <CCardHeader>Assign subjects for major</CCardHeader>
          <CCardBody>
            <div className="p-2">
              <CFormLabel>Select Major</CFormLabel>
              <SelectPicker
                block
                style={{ width: "100%" }}
                menuStyle={{ width: 300 }}
                data={payloadTable}
                labelKey="major_name"
                valueKey="id"
                placeholder="Select major"
                onChange={onChangeSelectMajor}
              />
            </div>
            <div className="p-2" style={{ width: "100%" }}>
              <CFormLabel>Assign Subject</CFormLabel>
              <TagPicker
                block
                data={payloadSubjects}
                labelKey="subject_name"
                valueKey="id"
                style={{ width: "100%" }}
                menuStyle={{ width: 300 }}
                placeholder="Select subjects"
                value={valueSubjectPicker}
                onChange={(evt) => {
                  setValueSubjectsPicker(evt);
                }}
              />
            </div>
            <div className="p-3 d-flex flex-row">
              <CButton
                onClick={handleSaveSubjects}
                color="info">Assign</CButton>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default ListOrganization;
