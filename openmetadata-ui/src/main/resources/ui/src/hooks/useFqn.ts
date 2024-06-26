/*
 *  Copyright 2024 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { useParams } from 'react-router-dom';
import { getDecodedFqn } from '../utils/StringsUtils';

type Fqn = { fqn: string; ingestionFQN: string };

/**
 * @description Hook to get the decoded fqn and ingestionFQN from the url
 * @returns {fqn: string, ingestionFQN: string} - fqn and ingestionFQN from the url
 */
export const useFqn = (): Fqn => {
  const { fqn, ingestionFQN } = useParams<Fqn>();

  return {
    fqn: fqn ? getDecodedFqn(fqn) : '',
    ingestionFQN: ingestionFQN ? getDecodedFqn(ingestionFQN) : '',
  };
};
