#  Copyright 2021 Schlameel
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

"""
OpenMetadata high-level API Glossary test
"""
import logging
import time
from copy import deepcopy
from unittest import TestCase

from metadata.generated.schema.api.data.createGlossary import CreateGlossaryRequest
from metadata.generated.schema.api.data.createGlossaryTerm import (
    CreateGlossaryTermRequest,
)
from metadata.generated.schema.api.teams.createUser import CreateUserRequest
from metadata.generated.schema.entity.data.glossary import Glossary
from metadata.generated.schema.entity.data.glossaryTerm import (
    GlossaryTerm,
    TermReference,
)
from metadata.generated.schema.entity.services.connections.metadata.openMetadataConnection import (
    OpenMetadataConnection,
)
from metadata.generated.schema.entity.teams.user import User
from metadata.generated.schema.security.client.openMetadataJWTClientConfig import (
    OpenMetadataJWTClientConfig,
)
from metadata.generated.schema.type import basic
from metadata.generated.schema.type.basic import (
    Email,
    EntityName,
    FullyQualifiedEntityName,
    Markdown,
)
from metadata.generated.schema.type.entityReference import EntityReference
from metadata.generated.schema.type.entityReferenceList import EntityReferenceList
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.ingestion.ometa.utils import model_str
from metadata.utils import fqn


class OMetaGlossaryTest(TestCase):
    """
    Run this integration test with the local API available
    Install the ingestion package before running the tests
    """

    service_entity_id = None
    glossary_entity_id: basic.Uuid = None
    create_glossary: CreateGlossaryRequest = None
    create_glossary_term_1: CreateGlossaryTermRequest = None
    create_glossary_term_2: CreateGlossaryTermRequest = None
    create_glossary_term_3: CreateGlossaryTermRequest = None
    glossary: Glossary = None
    glossary_term_1: GlossaryTerm = None
    glossary_term_2: GlossaryTerm = None
    glossary_term_3: GlossaryTerm = None
    user_1: User = None
    user_2: User = None
    user_3: User = None

    server_config = OpenMetadataConnection(
        hostPort="http://localhost:8585/api",
        authProvider="openmetadata",
        securityConfig=OpenMetadataJWTClientConfig(
            jwtToken="eyJraWQiOiJHYjM4OWEtOWY3Ni1nZGpzLWE5MmotMDI0MmJrOTQzNTYiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlzQm90IjpmYWxzZSwiaXNzIjoib3Blbi1tZXRhZGF0YS5vcmciLCJpYXQiOjE2NjM5Mzg0NjIsImVtYWlsIjoiYWRtaW5Ab3Blbm1ldGFkYXRhLm9yZyJ9.tS8um_5DKu7HgzGBzS1VTA5uUjKWOCU0B_j08WXBiEC0mr0zNREkqVfwFDD-d24HlNEbrqioLsBuFRiwIWKc1m_ZlVQbG7P36RUxhuv2vbSp80FKyNM-Tj93FDzq91jsyNmsQhyNv_fNr3TXfzzSPjHt8Go0FMMP66weoKMgW2PbXlhVKwEuXUHyakLLzewm9UMeQaEiRzhiTMU3UkLXcKbYEJJvfNFcLwSl9W8JCO_l0Yj3ud-qt_nQYEZwqW6u5nfdQllN133iikV4fM5QZsMCnm8Rq1mvLR0y9bmJiD7fwM1tmJ791TUWqmKaTnP49U493VanKpUAfzIiOiIbhg"
        ),
    )
    metadata = OpenMetadata(server_config)

    assert metadata.health_check()

    @classmethod
    def check_es_index(cls) -> None:
        """
        Wait until the index has been updated with the test user.
        """
        logging.info("Checking ES index status...")
        tries = 0

        res = None
        while not res and tries <= 5:  # Kill in 5 seconds
            res = cls.metadata.es_search_from_fqn(
                entity_type=User,
                fqn_search_string="Levy",
            )
            if not res:
                tries += 1
                time.sleep(1)

    @classmethod
    def setUpClass(cls) -> None:
        """
        Prepare ingredients
        """

        cls.user_1 = cls.metadata.create_or_update(
            data=CreateUserRequest(
                name=EntityName("test.user.1"),
                email=Email(root="test.user.1@getcollate.io"),
            ),
        )

        cls.user_2 = cls.metadata.create_or_update(
            data=CreateUserRequest(
                name=EntityName("test.user.2"),
                email=Email(root="test.user.2@getcollate.io"),
            ),
        )

        cls.user_3 = cls.metadata.create_or_update(
            data=CreateUserRequest(
                name=EntityName("test.user.3"),
                email=Email(root="test.user.3@getcollate.io"),
            ),
        )

        cls.check_es_index()

        cls.create_glossary = CreateGlossaryRequest(
            name=EntityName("test-glossary"),
            displayName="test-glossary",
            description=Markdown("Description of test glossary"),
            owner=EntityReference(
                id=cls.user_1.id,
                type="user",
            ),
        )

        cls.create_glossary_term_1 = CreateGlossaryTermRequest(
            glossary=FullyQualifiedEntityName(cls.create_glossary.name.root),
            name=EntityName("GT1"),
            displayName="Glossary Term 1",
            description=Markdown("Test glossary term 1"),
            owner=EntityReference(
                id=cls.user_1.id,
                type="user",
            ),
        )

        cls.create_glossary_term_2 = CreateGlossaryTermRequest(
            glossary=FullyQualifiedEntityName(cls.create_glossary.name.root),
            name=EntityName("GT2"),
            displayName="Glossary Term 2",
            description=Markdown("Test glossary term 2"),
            synonyms=[
                EntityName("GT2S1"),
                EntityName("GT2S2"),
                EntityName("GT2S3"),
            ],
            owner=EntityReference(
                id=cls.user_1.id,
                type="user",
            ),
        )

        cls.create_glossary_term_3 = CreateGlossaryTermRequest(
            glossary=FullyQualifiedEntityName(cls.create_glossary.name.root),
            name=EntityName("GT3"),
            displayName="Glossary Term 3",
            description=Markdown("Test glossary term 3"),
            synonyms=[
                EntityName("GT2S1"),
                EntityName("GT2S2"),
                EntityName("GT2S3"),
            ],
            owner=EntityReference(
                id=cls.user_1.id,
                type="user",
            ),
        )

        # Leave some time for indexes to get updated, otherwise this happens too fast
        cls.check_es_index()

    @classmethod
    def tearDownClass(cls) -> None:
        """
        Clean up
        """

        cls.metadata.delete(
            entity=User,
            entity_id=cls.user_1.id,
            recursive=True,
            hard_delete=True,
        )

        cls.metadata.delete(
            entity=User,
            entity_id=cls.user_2.id,
            hard_delete=True,
        )

        cls.metadata.delete(
            entity=User,
            entity_id=cls.user_3.id,
            hard_delete=True,
        )

        if cls.glossary_term_3 is not None:
            cls.metadata.delete(
                entity=GlossaryTerm,
                entity_id=cls.glossary_term_3.id,
                hard_delete=True,
            )

        if cls.glossary_term_2 is not None:
            cls.metadata.delete(
                entity=GlossaryTerm,
                entity_id=cls.glossary_term_2.id,
                hard_delete=True,
            )

        if cls.glossary_term_1 is not None:
            cls.metadata.delete(
                entity=GlossaryTerm,
                entity_id=cls.glossary_term_1.id,
                hard_delete=True,
            )

        # glossary: Glossary = cls.metadata.get_by_name(
        #     entity=Glossary,
        #     fqn=model_str(cls.create_glossary.name),
        # )
        if cls.glossary_entity_id is not None:
            cls.metadata.delete(
                entity=Glossary,
                entity_id=cls.glossary_entity_id,
                hard_delete=True,
            )

    def test_create_glossary(self):
        """
        Create a Glossary
        """
        self.glossary = self.metadata.create_or_update(self.create_glossary)
        self.assertIsNotNone(self.glossary)
        self.assertEqual(self.create_glossary.name, self.glossary.name)
        if self.glossary_entity_id is None:
            self.glossary_entity_id = self.glossary.id

    def test_create_glossary_term(self):
        """
        Test the creation of a glossary term
        """

        if OMetaGlossaryTest.glossary_entity_id is None:
            glossary: Glossary = self.metadata.create_or_update(self.create_glossary)
            OMetaGlossaryTest.glossary_entity_id = glossary.id

        # Create without parent
        res: GlossaryTerm = self.metadata.create_or_update(self.create_glossary_term_1)
        self.assertIsNotNone(res)
        self.assertEqual(self.create_glossary_term_1.name, res.name)
        self.assertEqual(
            f"{self.create_glossary.name.root}.{res.name.root}",
            res.fullyQualifiedName.root,
        )

        # Create with parent
        if OMetaGlossaryTest.glossary_term_1 is None:
            OMetaGlossaryTest.glossary_term_1 = res
        self.create_glossary_term_2.parent = self.glossary_term_1.fullyQualifiedName
        res = self.metadata.create_or_update(self.create_glossary_term_2)
        self.assertIsNotNone(res)
        self.assertEqual(self.create_glossary_term_2.name, res.name)
        self.assertEqual(model_str(self.create_glossary_term_1.name), res.parent.name)
        if OMetaGlossaryTest.glossary_term_2 is None:
            OMetaGlossaryTest.glossary_term_2 = res

    def test_patch_glossary_term_parent(self):
        """
        Update parent via PATCH
        """
        if OMetaGlossaryTest.glossary_entity_id is None:
            glossary: Glossary = self.metadata.create_or_update(self.create_glossary)
            OMetaGlossaryTest.glossary_entity_id = glossary.id
        if self.glossary_term_1 is None:
            OMetaGlossaryTest.glossary_term_1 = self.metadata.create_or_update(
                self.create_glossary_term_1
            )
        if self.glossary_term_2 is None:
            self.create_glossary_term_2.parent = self.glossary_term_1.fullyQualifiedName
            OMetaGlossaryTest.glossary_term_2 = self.metadata.create_or_update(
                self.create_glossary_term_2
            )
        if self.glossary_term_3 is None:
            OMetaGlossaryTest.glossary_term_3 = self.metadata.create_or_update(
                self.create_glossary_term_3
            )

        dest_glossary_term_3 = deepcopy(self.glossary_term_3)
        dest_glossary_term_3.parent = EntityReference(
            id=self.glossary_term_2.id, type="glossaryTerm"
        )

        # Add parent
        res: GlossaryTerm = self.metadata.patch(
            entity=GlossaryTerm,
            source=self.glossary_term_3,
            destination=dest_glossary_term_3,
        )
        self.assertIsNotNone(res)
        self.assertEqual(self.glossary_term_2.id, res.parent.id)

        # Move parent
        dest_glossary_term_3.parent = EntityReference(
            id=self.glossary_term_1.id, type="glossaryTerm"
        )
        res: GlossaryTerm = self.metadata.patch(
            entity=GlossaryTerm,
            source=self.glossary_term_3,
            destination=dest_glossary_term_3,
        )

        self.assertIsNotNone(res)
        self.assertEqual(self.glossary_term_1.id, res.parent.id)
        dest_glossary_term_3 = deepcopy(res)
        # Delete parent
        dest_glossary_term_3.parent = None
        res: GlossaryTerm = self.metadata.patch(
            entity=GlossaryTerm,
            source=res,
            destination=dest_glossary_term_3,
        )
        self.assertIsNotNone(res)
        self.assertIsNone(res.parent)

    def test_patch_glossary_term_related_terms(self):
        """
        Update related terms via PATCH
        """
        if OMetaGlossaryTest.glossary_entity_id is None:
            glossary: Glossary = self.metadata.create_or_update(self.create_glossary)
            OMetaGlossaryTest.glossary_entity_id = glossary.id
        if self.glossary_term_1 is None:
            OMetaGlossaryTest.glossary_term_1 = self.metadata.create_or_update(
                self.create_glossary_term_1
            )
        if self.glossary_term_2 is None:
            OMetaGlossaryTest.glossary_term_2 = self.metadata.create_or_update(
                self.create_glossary_term_2
            )
        elif self.glossary_term_2.parent is not None:
            dest_glossary_term_2 = deepcopy(self.glossary_term_2)
            dest_glossary_term_2.parent = EntityReference(
                id=self.glossary_term_1.id, type="glossaryTerm"
            )
            self.metadata.patch(
                entity=GlossaryTerm,
                source=self.glossary_term_2,
                destination=dest_glossary_term_2,
            )

        if self.glossary_term_3 is None:
            OMetaGlossaryTest.glossary_term_3 = self.metadata.create_or_update(
                self.create_glossary_term_3
            )
        elif self.glossary_term_3.parent is not None:
            dest_glossary_term_3 = deepcopy(self.glossary_term_3)
            dest_glossary_term_3.parent = None
            self.metadata.patch(
                entity=GlossaryTerm,
                source=self.glossary_term_3,
                destination=dest_glossary_term_3,
            )

        # Add related term
        dest_glossary_term_1 = deepcopy(self.glossary_term_1)
        dest_glossary_term_1.relatedTerms = None
        if dest_glossary_term_1.relatedTerms is not None:
            dest_glossary_term_1.relatedTerms = None
        dest_glossary_term_1.relatedTerms = EntityReferenceList(
            root=[EntityReference(id=self.glossary_term_2.id, type="glossaryTerm")]
        )
        res: GlossaryTerm = self.metadata.patch(
            entity=GlossaryTerm,
            source=self.glossary_term_1,
            destination=dest_glossary_term_1,
        )
        self.assertIsNotNone(res)
        self.assertEqual(1, len(res.relatedTerms.root))
        self.assertEqual(self.glossary_term_2.id, res.relatedTerms.root[0].id)

    def test_patch_reviewer(self):
        """
        Update reviewers via PATCH
        """
        if OMetaGlossaryTest.glossary is None:
            glossary: Glossary = self.metadata.create_or_update(self.create_glossary)
            OMetaGlossaryTest.glossary_entity_id = glossary.id
            self.glossary = glossary
        if self.glossary_term_1 is None:
            OMetaGlossaryTest.glossary_term_1 = self.metadata.create_or_update(
                self.create_glossary_term_1
            )
        # Add Glossary Reviewer
        dest_glossary = deepcopy(self.glossary)
        if dest_glossary.reviewers is None:
            dest_glossary.reviewers = []
        dest_glossary.reviewers.append(EntityReference(id=self.user_1.id, type="user"))
        res_glossary: Glossary = self.metadata.patch(
            entity=Glossary, source=self.glossary, destination=dest_glossary
        )

        self.assertIsNotNone(res_glossary)
        self.assertEqual(1, len(res_glossary.reviewers))
        self.assertEqual(self.user_1.id, res_glossary.reviewers[0].id)

        # Remove only Glossary reviewer
        dest_glossary = deepcopy(res_glossary)
        dest_glossary.reviewers.pop(0)
        res_glossary: Glossary = self.metadata.patch(
            entity=Glossary, source=res_glossary, destination=dest_glossary
        )
        self.assertIsNotNone(res_glossary)
        self.assertEqual(0, len(res_glossary.reviewers))
        dest_glossary = deepcopy(res_glossary)
        dest_glossary.reviewers.append(EntityReference(id=self.user_1.id, type="user"))
        dest_glossary.reviewers.append(EntityReference(id=self.user_2.id, type="user"))
        dest_glossary.reviewers.append(EntityReference(id=self.user_3.id, type="user"))
        res_glossary: Glossary = self.metadata.patch(
            entity=Glossary, source=res_glossary, destination=dest_glossary
        )
        # Remove one Glossary reviewer when there are many
        # delete self.user_3
        dest_glossary = deepcopy(res_glossary)
        dest_glossary.reviewers.pop(2)
        res_glossary: Glossary = self.metadata.patch(
            entity=Glossary, source=res_glossary, destination=dest_glossary
        )
        self.assertIsNotNone(res_glossary)
        self.assertEqual(2, len(res_glossary.reviewers))
        self.assertEqual(self.user_1.id, res_glossary.reviewers[0].id)
        self.assertEqual(self.user_2.id, res_glossary.reviewers[1].id)

        # Add GlossaryTerm Reviewer
        dest_glossary_term_1 = deepcopy(self.glossary_term_1)
        dest_glossary_term_1.reviewers.root.append(
            EntityReference(id=self.user_1.id, type="user")
        )
        res_glossary_term: GlossaryTerm = self.metadata.patch(
            entity=GlossaryTerm,
            source=self.glossary_term_1,
            destination=dest_glossary_term_1,
        )

        self.assertIsNotNone(res_glossary_term)
        self.assertEqual(2, len(res_glossary_term.reviewers.root))
        self.assertEqual(self.user_1.id, res_glossary_term.reviewers.root[0].id)
        dest_glossary_term_1 = deepcopy(res_glossary_term)
        dest_glossary_term_1.reviewers.root.pop(0)
        res_glossary_term = self.metadata.patch(
            entity=GlossaryTerm,
            source=res_glossary_term,
            destination=dest_glossary_term_1,
        )
        self.assertIsNotNone(res_glossary_term)

        # inherited reviewers from glossary
        self.assertEqual(2, len(res_glossary_term.reviewers.root))

    def test_patch_glossary_term_synonyms(self):
        """
        Update synonyms via PATCH
        """
        if OMetaGlossaryTest.glossary_entity_id is None:
            glossary: Glossary = self.metadata.create_or_update(self.create_glossary)
            OMetaGlossaryTest.glossary_entity_id = glossary.id
        if self.glossary_term_1 is None:
            OMetaGlossaryTest.glossary_term_1 = self.metadata.create_or_update(
                self.create_glossary_term_1
            )
        dest_glossary_term_1 = deepcopy(self.glossary_term_1)
        if dest_glossary_term_1.synonyms is None:
            dest_glossary_term_1.synonyms = list()

        if dest_glossary_term_1.synonyms is None:
            dest_glossary_term_1.synonyms = []
        dest_glossary_term_1.synonyms.append(EntityName("GT1S1"))

        # Add GlossaryTerm synonym
        res: GlossaryTerm = self.metadata.patch(
            entity=GlossaryTerm,
            source=self.glossary_term_1,
            destination=dest_glossary_term_1,
        )
        self.assertIsNotNone(res)
        self.assertEqual(1, len(res.synonyms))
        self.assertEqual("GT1S1", model_str(res.synonyms[0]))
        self.glossary_term_1 = self.metadata.get_by_id(
            entity=GlossaryTerm, entity_id=self.glossary_term_1.id, fields=["*"]
        )
        dest_glossary_term_1 = deepcopy(res)
        # Remove GlossaryTerm synonym
        dest_glossary_term_1.synonyms.pop(0)
        res = self.metadata.patch(
            entity=GlossaryTerm,
            source=res,
            destination=dest_glossary_term_1,
        )
        self.assertIsNotNone(res)
        self.assertEqual(0, len(res.synonyms))
        dest_glossary_term_1 = deepcopy(res)
        dest_glossary_term_1.synonyms.append(EntityName("GT1S1"))
        dest_glossary_term_1.synonyms.append(EntityName("GT1S2"))
        dest_glossary_term_1.synonyms.append(EntityName("GT1S3"))

        res: GlossaryTerm = self.metadata.patch(
            entity=GlossaryTerm,
            source=res,
            destination=dest_glossary_term_1,
        )
        self.assertIsNotNone(res)
        self.assertEqual(3, len(res.synonyms))
        self.assertEqual("GT1S2", model_str(res.synonyms[1]))

    def test_patch_glossary_term_references(self):
        """
        Update GlossaryTerm references via PATCH
        """

        if OMetaGlossaryTest.glossary_entity_id is None:
            glossary: Glossary = self.metadata.create_or_update(self.create_glossary)
            OMetaGlossaryTest.glossary_entity_id = glossary.id
            self.glossary = glossary
        if self.glossary_term_1 is None:
            OMetaGlossaryTest.glossary_term_1 = self.metadata.create_or_update(
                self.create_glossary_term_1
            )

        dest_glossary_term_1 = deepcopy(self.glossary_term_1)
        if dest_glossary_term_1.references is None:
            dest_glossary_term_1.references = []
        dest_glossary_term_1.references.append(
            TermReference(name="GT1S1", endpoint="https://www.getcollate.io")
        )
        # Add reference
        res: GlossaryTerm = self.metadata.patch(
            entity=GlossaryTerm,
            source=self.glossary_term_1,
            destination=dest_glossary_term_1,
        )
        self.assertIsNotNone(res)
        self.assertEqual(1, len(res.references))
        self.assertEqual("GT1S1", res.references[0].name)

        # Remove reference
        dest_glossary_term_1_noref = deepcopy(res)
        dest_glossary_term_1_noref.references = []

        self.metadata.patch(
            entity=GlossaryTerm, source=res, destination=dest_glossary_term_1_noref
        )

        res: GlossaryTerm = self.metadata.get_by_name(
            entity=GlossaryTerm,
            fqn=fqn._build(
                self.create_glossary.name.root,
                self.create_glossary_term_1.name.root,
            ),
        )

        self.assertIsNotNone(res)
        self.assertEqual(0, len(res.references))

        # Remove reference when there are many
        dest_glossary_term_1 = deepcopy(res)
        dest_glossary_term_1.references.append(
            TermReference(name="GT1S1", endpoint="https://www.getcollate.io")
        )
        dest_glossary_term_1.references.append(
            TermReference(name="GT1S2", endpoint="https://open-metadata.org/")
        )
        dest_glossary_term_1.references.append(
            TermReference(
                name="GT1S3", endpoint="https://github.com/open-metadata/OpenMetadata"
            )
        )

        res: GlossaryTerm = self.metadata.patch(
            entity=GlossaryTerm, source=res, destination=dest_glossary_term_1
        )
        self.assertIsNotNone(res)
        self.assertEqual(3, len(res.references))
        self.assertEqual("GT1S2", res.references[1].name)
